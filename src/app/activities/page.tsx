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
import { HelpCircle, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Sparkles, BarChart2, Search, Menu, AlignJustify, LayoutGrid, Square, type LucideIcon } from 'lucide-react'
import { TabbedPageLayout, type PageTab } from '@/components/ui/TabbedPageLayout'
import { ActivityTitle } from '@/components/activity/ActivityTitle'
import { Spinner } from '@/components/ui/Spinner'
import { SkeletonFitnessCards } from '@/components/ui/Skeleton'
import { PageLoader } from '@/components/ui/PageLoader'
import { ActivityMapCard } from '@/components/activity/ActivityMapCard'
import { LapsChart } from '@/components/activity/LapsChart'
import { LapsTable } from '@/components/activity/LapsTable'
import { LapsBikeChart } from '@/components/activity/LapsBikeChart'
import { LapsDetailView } from '@/components/activity/LapsDetailView'
import { ClimbDescentSection, detectSegments } from '@/components/activity/ClimbDescentSection'
import { WorkoutTypeBadges } from '@/components/activity/WorkoutTypeBadges'
import { MuscuSessionPanel } from '@/components/activity/MuscuSessionPanel'
import { SwimLengths } from '@/components/activity/SwimLengths'
import { MuscuActivityView } from '@/components/activity/MuscuActivityView'
import ProgressionHub from '@/app/progression/page'
import { ProgressionSportView } from '@/app/progression/components/ProgressionSportView'
import { RunningLapsSection } from '@/components/activity/RunningLapsSection'
import { formatPace as fmtPaceMinKm, speedToPace as kmhToPaceMin, formatPaceSwim } from '@/lib/utils/pace'
import { formatSplit, speedKmhToSplit500 } from '@/lib/utils/split'
import { computeVapKmh, avgAdjustedPaceMinKm } from '@/lib/utils/vap'
import { RecordsBeaten } from '@/components/activity/RecordsBeaten'
import { ActivityCard, type ActivityCardData } from '@/components/activity/ActivityCard'
import { WeeklyGoals } from '@/components/activity/WeeklyGoals'
import { MonthlySummary } from '@/components/activity/MonthlySummary'
import { shareCard } from '@/lib/share/shareCard'
import { useSmSn } from '@/hooks/useSmSn'
import { smSnFromRow } from '@/lib/metrics/smSn'
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
  feeling:          number | null            // 0 à 5, saisi par l'athlète (pas de 0.5)
  difficulty:       number | null            // 0 à 10, saisi par l'athlète (pas de 0.5)
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
  lap_index?:        number
  start_index?:      number
  end_index?:        number
  distance_m:        number
  moving_time_s:     number
  elapsed_time_s?:   number | null
  avg_hr?:           number | null
  max_heartrate?:    number | null
  avg_speed_ms?:     number | null
  avg_watts?:        number | null
  max_watts?:        number | null
  avg_cadence?:      number | null
  elevation_gain_m?: number | null
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
  run: '#22c55e', trail_run: '#f97316', bike: '#3b82f6', virtual_bike: '#60a5fa',
  swim: '#06b6d4', rowing: '#14b8a6', hyrox: '#ec4899', gym: '#f97316', other: '#94a3b8',
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

// Format YYYY-MM-DD en heure LOCALE (toISOString() convertit en UTC et décale
// la date d'un jour en fuseau UTC+x → semaines/jours faux).
function localYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoWeek(d: Date): string {
  return localYMD(getWeekStart(d))
}

// FC : seuls la course à pied et le vélo ont une FC pertinente (sélecteur + calculs).
const HR_SPORTS = ['run', 'trail_run', 'bike']

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
// Colonnes de la LISTE — on exclut les gros JSONB (streams, raw_data,
// power_curve, pace_curve) qui ne servent qu'au détail : un `select('*')` les
// tirait pour chaque ligne → payload énorme → timeout (500). On garde tout le
// reste (dont summary_polyline pour la mini-carte et laps).
const LIST_COLUMNS = 'id,user_id,provider,provider_id,external_url,sport_type,is_race,race_name,title,description,notes,started_at,ended_at,timezone,moving_time_s,elapsed_time_s,distance_m,elevation_gain_m,elevation_loss_m,max_elevation_m,avg_speed_ms,max_speed_ms,avg_pace_s_km,avg_watts,max_watts,normalized_watts,kilojoules,ftp_at_time,intensity_factor,tss,avg_hr,max_hr,min_hr,avg_cadence,max_cadence,calories,suffer_score,perceived_effort,rpe,avg_temp_c,weather,gear_name,trainer,commute,flagged,laps,created_at,updated_at,total_descent_m,trimp,aerobic_decoupling,average_heartrate,max_heartrate,average_speed,cardiac_drift_pct,summary_polyline,strava_gear_id,records_processed,records_beaten,feeling,difficulty,ef_value,power_hr_ratio,decoupling_pct,ef_calculation_method,sm_score,sn_score'

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
    // Les coupures réseau / blips Supabase étaient affichés en « [object Object] ».
    // On retente silencieusement (jusqu'à 3 fois) avant d'éventuellement afficher
    // une vraie erreur — et seulement au chargement initial.
    let lastErr: unknown = null
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const sb = createClient()
          const from = pageNum * PAGE_SIZE
          const { data, error: err, count } = await sb
            .from('activities')
            .select(LIST_COLUMNS, { count: 'exact' })
            .order('started_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1)
          if (err) throw err
          const items = (data ?? []) as unknown as Activity[]
          if (reset) setActivities(items)
          else setActivities(prev => [...prev, ...items])
          if (count !== null) setTotalCount(count)
          setHasMore(items.length === PAGE_SIZE)
          setError(null)
          return
        } catch (e) {
          lastErr = e
          await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
        }
      }
      const o = lastErr as { message?: unknown } | null
      const msg = lastErr instanceof Error ? lastErr.message
        : (o && typeof o.message === 'string') ? o.message
        : 'Connexion interrompue — réessaie.'
      if (reset) setError(msg)
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
      <div className="stat-number" style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{value}</div>
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
        {segments.filter(seg => seg.time > 0).map((seg, i) => (
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

// Mapping distance_label (personal_records) → index dans MMP_TABLE_DURATIONS
const BIKE_DUR_TO_IDX: Record<string, number> = {
  'Pmax':  0,  // 1s
  '10s':   2,  // 10s
  '30s':   3,  // 30s
  '1min':  4,  // 60s
  '3min':  5,  // 180s
  '5min':  6,  // 300s
  '8min':  7,  // 480s
  '10min': 8,  // 600s
  '12min': 9,  // 720s
  '15min': 10, // 900s
  '20min': 11, // 1200s
  '30min': 12, // 1800s
  '45min': 13, // 2700s
  '1h':    14, // 3600s
  '90min': 15, // 5400s
  '2h':    16, // 7200s
  '3h':    17, // 10800s
  '4h':    18, // 14400s
  '5h':    19, // 18000s
  '6h':    20, // 21600s
}

// ── Zones de puissance Coggan (% FTP) pour overlay arrière-plan MMP ──
const MMP_POWER_ZONES = [
  { z: 1, label: 'Z1 Récup',     min: 0,    max: 0.55, color: '#94a3b8' },
  { z: 2, label: 'Z2 Endurance', min: 0.55, max: 0.75, color: '#06B6D4' },
  { z: 3, label: 'Z3 Tempo',     min: 0.75, max: 0.90, color: '#10b981' },
  { z: 4, label: 'Z4 Seuil',     min: 0.90, max: 1.05, color: '#eab308' },
  { z: 5, label: 'Z5 VO2max',    min: 1.05, max: 1.20, color: '#f97316' },
  { z: 6, label: 'Z6 Anaér.',    min: 1.20, max: 1.50, color: '#ef4444' },
  { z: 7, label: 'Z7 Neuromusc', min: 1.50, max: 99,   color: '#7c2d12' },
]
function getPowerZone(watts: number, ftp: number | null): typeof MMP_POWER_ZONES[number] | null {
  if (!ftp || ftp <= 0 || watts <= 0) return null
  const ratio = watts / ftp
  return MMP_POWER_ZONES.find(z => ratio < z.max) ?? MMP_POWER_ZONES[MMP_POWER_ZONES.length - 1]
}

function PowerCurveChart({ watts, activityId, activityDurationS, ftp }: {
  watts:             number[]
  activityId:        string
  activityDurationS: number
  ftp?:              number | null
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const N = watts.length
  // Mobile : edge-to-edge — retire le paddingLeft:32 du conteneur,
  // bump des fontSize axes pour lisibilité sur largeur réduite.
  const isMobileMmp = useWindowWidth() < 768
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

  // Records: personal_records table (same source as Performance page)
  const [yearMmp,      setYearMmp]      = useState<number[] | null>(null)
  const [allTimeMmp,   setAllTimeMmp]   = useState<number[] | null>(null)
  const [recordFilter, setRecordFilter] = useState<'year' | 'alltime'>('alltime')
  const [prLoading,    setPrLoading]    = useState(false)

  useEffect(() => {
    setPrLoading(true)
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
    type RecRow = { distance_label: string; performance: string; achieved_at: string }

    void (async () => {
      try {
        const { data } = await createClient()
          .from('personal_records')
          .select('distance_label, performance, achieved_at')
          .eq('sport', 'bike')
          .order('achieved_at', { ascending: false })
        const recs = (data ?? []) as RecRow[]
        const yearBest = MMP_TABLE_DURATIONS.map(() => 0)
        const allBest  = MMP_TABLE_DURATIONS.map(() => 0)
        for (const rec of recs) {
          const idx = BIKE_DUR_TO_IDX[rec.distance_label]
          if (idx === undefined) continue
          const w = parseInt(rec.performance) || 0
          if (w <= 0) continue
          if (w > allBest[idx]) allBest[idx] = w
          if (rec.achieved_at >= yearStart && w > yearBest[idx]) yearBest[idx] = w
        }
        setYearMmp(yearBest)
        setAllTimeMmp(allBest)
        setPrLoading(false)
      } catch { setPrLoading(false) }
    })()
  }, [activityId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Helper : interpole une courbe à partir des arrays MMP_TABLE_DURATIONS-indexés
  function interpolateCurve(table: number[] | null): number[] | null {
    if (!table || !table.some(v => v > 0)) return null
    const curve = DURATIONS.map(d => {
      const ti = MMP_TABLE_DURATIONS.indexOf(d)
      if (ti >= 0) return table[ti] > 0 ? table[ti] : 0
      for (let i = 0; i < MMP_TABLE_DURATIONS.length - 1; i++) {
        if (MMP_TABLE_DURATIONS[i] <= d && MMP_TABLE_DURATIONS[i + 1] >= d) {
          const lo = table[i], hi = table[i + 1]
          if (lo > 0 && hi > 0) {
            const t = (d - MMP_TABLE_DURATIONS[i]) / (MMP_TABLE_DURATIONS[i + 1] - MMP_TABLE_DURATIONS[i])
            return Math.round(lo * (1 - t) + hi * t)
          }
          return lo > 0 ? lo : hi > 0 ? hi : 0
        }
      }
      return 0
    })
    return curve.some(v => v > 0) ? curve : null
  }

  // Courbe rouge pointillée = TOUJOURS All Time (indépendant du toggle MmpTable)
  const recordCurve = useMemo(() => interpolateCurve(allTimeMmp), [allTimeMmp]) // eslint-disable-line react-hooks/exhaustive-deps
  // Courbe année séparée pour différencier les trophées (cyan vs doré)
  const yearCurve   = useMemo(() => interpolateCurve(yearMmp),    [yearMmp])   // eslint-disable-line react-hooks/exhaustive-deps

  // Trophées : 🏆 par durée selon le type de record battu
  const trophies = useMemo((): { i: number; kind: 'allTime' | 'year' }[] => {
    const result: { i: number; kind: 'allTime' | 'year' }[] = []
    for (let i = 0; i < DURATIONS.length; i++) {
      const sess = mmp[i]
      if (sess <= 0) continue
      const at = recordCurve?.[i] ?? 0
      if (at > 0 && sess > at) { result.push({ i, kind: 'allTime' }); continue }
      const yr = yearCurve?.[i] ?? 0
      if (yr > 0 && sess > yr) result.push({ i, kind: 'year' })
    }
    return result
  }, [mmp, recordCurve, yearCurve])

  const { idx: _rawIdx, pct, onMove, onLeave } = useCrosshairSvg(svgRef, DURATIONS.length)
  void _rawIdx
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

  const W = 1000, H = 220

  // Sqrt scale: T_MIN=5s, T_MAX=activity duration
  // Donne plus d'espace aux efforts longs que l'échelle log
  const actMax = Math.max(activityDurationS, DURATIONS.length > 0 ? DURATIONS[DURATIONS.length - 1] : 5, 5)
  const sqrtMin = Math.sqrt(5)
  const sqrtMax = Math.sqrt(actMax)
  function sqrtX(t: number): number {
    return (Math.sqrt(t) - sqrtMin) / (sqrtMax - sqrtMin) * W
  }

  // ── Y axis ÉCHELLE LOGARITHMIQUE (style Strava / TrainingPeaks) ───────
  const Y_MIN = 50
  const allVals = [...mmp, ...(recordCurve ?? []), ...(yearCurve ?? [])]
  const Y_MAX = Math.max(...allVals.filter(v => v > 0), 200) * 1.2
  const logMin = Math.log10(Y_MIN)
  const logMax = Math.log10(Y_MAX)
  function yOf(v: number): number {
    if (v <= 0) return H
    const clamped = Math.max(Y_MIN, v)
    return H - ((Math.log10(clamped) - logMin) / (logMax - logMin)) * H
  }
  // Ticks Y fixes (spec : 100, 200, 300, 500, 1000, 1500 dans le domaine)
  const yTicks = [100, 200, 300, 500, 1000, 1500].filter(t => t >= Y_MIN && t <= Y_MAX)

  function buildCurvePaths(vals: number[]): { fill: string; line: string } {
    const pts = DURATIONS.map((d, i) => `${sqrtX(d).toFixed(1)},${yOf(vals[i]).toFixed(1)}`)
    return {
      fill: `M${sqrtX(DURATIONS[0]).toFixed(1)},${H}L${pts.join('L')}L${sqrtX(DURATIONS[DURATIONS.length-1]).toFixed(1)},${H}Z`,
      line: `M${pts.join('L')}`,
    }
  }

  // Smoothing léger de la courbe record pour éviter les pics anguleux (3-point moving avg)
  const recordCurveSmooth = useMemo(() => {
    if (!recordCurve) return null
    return recordCurve.map((v, i) => {
      const vals = [
        recordCurve[Math.max(0, i - 1)],
        v,
        recordCurve[Math.min(recordCurve.length - 1, i + 1)],
      ].filter(x => x > 0)
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : v
    })
  }, [recordCurve])

  const { fill: fillPath, line: linePath } = buildCurvePaths(mmp)
  const recPaths = recordCurveSmooth ? buildCurvePaths(recordCurveSmooth) : null

  // Zones où mmp[i] > recordCurve[i] → mise en valeur visuelle (segments verts)
  const recordBeatSegments = useMemo(() => {
    if (!recordCurve) return []
    const segs: { x: number; y: number }[][] = []
    let cur: { x: number; y: number }[] = []
    for (let i = 0; i < DURATIONS.length; i++) {
      if (mmp[i] > (recordCurve[i] ?? 0) && recordCurve[i] > 0) {
        cur.push({ x: sqrtX(DURATIONS[i]), y: yOf(mmp[i]) })
      } else {
        if (cur.length > 0) { segs.push(cur); cur = [] }
      }
    }
    if (cur.length > 0) segs.push(cur)
    return segs
  }, [mmp, recordCurve]) // eslint-disable-line react-hooks/exhaustive-deps

  // Durées clés pour marqueurs : 5s, 1', 5', 20', 1h (les indices à highlight)
  const KEY_DURATIONS_S = [5, 60, 300, 1200, 3600]
  const keyDurIndices = KEY_DURATIONS_S
    .map(d => DURATIONS.indexOf(d))
    .filter(idx => idx >= 0 && mmp[idx] > 0)

  // Sqrt-aware hit detection: find nearest DURATION to cursor position in sqrt space
  const sqrtIdx = useMemo((): number | null => {
    if (pct === null || DURATIONS.length === 0) return null
    // SVG viewBox is "-32 0 {W+32} {H}", so svgX = -32 + pct*(W+32)
    const svgX = -32 + pct * (W + 32)
    const xClamped = Math.max(0, Math.min(W, svgX))
    const sqrtT = xClamped / W * (sqrtMax - sqrtMin) + sqrtMin
    const dCursor = sqrtT * sqrtT
    let best = 0, bestDist = Infinity
    DURATIONS.forEach((d, i) => {
      const dist = Math.abs(Math.sqrt(d) - Math.sqrt(dCursor))
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    return best
  }, [pct]) // eslint-disable-line react-hooks/exhaustive-deps

  // cursorX in SVG coords: linear follow of mouse (visual feedback)
  const cursorX = pct !== null ? (-32 + pct * (W + 32)) : null
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
      {/* Header card : titre + compteur records battus */}
      <div style={{
        display:        'flex',
        alignItems:     'baseline',
        justifyContent: 'space-between',
        padding:        '18px 16px 12px',
        gap:            10,
      }}>
        <span style={{
          fontSize:       11,
          fontWeight:     700,
          letterSpacing:  '0.12em',
          textTransform:  'uppercase',
          color:          'var(--text-dim)',
        }}>
          Courbe de puissance
        </span>
        {prLoading ? (
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Calcul des records…</span>
        ) : trophies.length > 0 ? (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)' }}>
            {trophies.length} record{trophies.length > 1 ? 's' : ''} battu{trophies.length > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>

<div ref={mmpContainerRef} style={{ position: 'relative', cursor: 'crosshair', paddingLeft: isMobileMmp ? 0 : 32 }}>
        <svg ref={svgRef} viewBox={`-32 0 ${W + 32} ${H}`} style={{ width: '100%', height: isMobileMmp ? 260 : 280, display: 'block', overflow: 'visible' }}
          preserveAspectRatio="none"
          onMouseMove={handleMmpMove} onMouseLeave={handleMmpLeave}
          onTouchMove={e => { e.preventDefault(); onMove(e) }} onTouchEnd={onLeave}>
          <defs>
            <linearGradient id="mmpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02"/>
            </linearGradient>
          </defs>

          {/* Zones FTP en arrière-plan (bandes horizontales subtiles) */}
          {ftp && ftp > 0 && MMP_POWER_ZONES.map(z => {
            const wMin = z.min * ftp
            const wMax = Math.min(z.max * ftp, Y_MAX)
            if (wMax <= Y_MIN) return null
            const yTop    = yOf(Math.min(wMax, Y_MAX))
            const yBottom = yOf(Math.max(wMin, Y_MIN))
            const h = yBottom - yTop
            if (h < 1) return null
            return (
              <rect
                key={z.z}
                x={0} y={yTop} width={W} height={h}
                fill={z.color} fillOpacity={0.07}
              />
            )
          })}

          {/* Gridlines Y (échelle log) : 100, 200, 300, 500, 1000, 1500 */}
          {yTicks.map(w => {
            const y = yOf(w)
            return (
              <g key={w}>
                <line x1={0} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" opacity={0.5}/>
                <text x={-6} y={y + 3} textAnchor="end" style={{ fontSize: 8, fill: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>{w}</text>
              </g>
            )
          })}

          {/* Zone record All Time (opacity 0.08), derrière la zone séance */}
          {recPaths && (
            <path d={recPaths.fill} fill="#ef4444" fillOpacity="0.08"/>
          )}
          {/* Zone séance (devant) */}
          <path d={fillPath} fill="url(#mmpFill)"/>
          {/* Ligne record All Time pointillée */}
          {recPaths && (
            <path d={recPaths.line} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,3"
              strokeLinecap="round" strokeLinejoin="round"/>
          )}
          {/* Mise en valeur des segments où séance > record (trait vert épais sous la ligne séance) */}
          {recordBeatSegments.map((seg, si) => {
            if (seg.length < 2) return null
            const d = `M${seg.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}`
            return (
              <path key={`beat-${si}`} d={d} fill="none" stroke="#10b981" strokeWidth="5"
                strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
            )
          })}

          {/* Ligne séance pleine — au-dessus de tout */}
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"/>

          {/* Marqueurs sur les durées CLÉS (5s, 1', 5', 20', 1h) — point + label valeur */}
          {keyDurIndices.map(i => {
            const cx = sqrtX(DURATIONS[i])
            const cy = yOf(mmp[i])
            const w  = mmp[i]
            // Position du label : au-dessus si record battu (déjà trophée), sinon à droite
            const isBeaten = trophies.some(t => t.i === i)
            const labelY = isBeaten ? cy - 28 : cy - 10
            return (
              <g key={`key-${i}`}>
                <circle cx={cx} cy={cy} r={3.5} fill="#6366f1" stroke="var(--bg)" strokeWidth={1.5} />
                <text
                  x={cx} y={labelY}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontWeight={700}
                  fill="#6366f1"
                  style={{ fontFamily: 'DM Mono, monospace', fontVariantNumeric: 'tabular-nums' }}
                  pointerEvents="none"
                >
                  {w}
                </text>
              </g>
            )
          })}

          {/* Trophées 🏆 (gold = All Time, cyan = Année) sur la courbe séance */}
          {trophies.map(({ i, kind }) => {
            const cx     = sqrtX(DURATIONS[i])
            const cy     = yOf(mmp[i])
            const border = kind === 'allTime' ? '#eab308' : '#06B6D4'
            return (
              <g key={i} transform={`translate(${cx},${cy - 14})`}>
                <circle r="9" fill="var(--bg-card)" stroke={border} strokeWidth="1.5"/>
                <text x={0} y={3} textAnchor="middle" fontSize="10">🏆</text>
              </g>
            )
          })}

          {/* X axis labels in SVG — sqrt-aware spacing */}
          {DURATIONS.map((d, i) => {
            const x = sqrtX(d)
            // Avoid crowding: show label only if enough horizontal room from neighbors
            if (i > 0 && sqrtX(DURATIONS[i-1]) > x - 28) return null
            return (
              <text key={d} x={x} y={H + 14} textAnchor="middle"
                fontSize={isMobileMmp ? 9 : 8} fill="var(--text-dim)" style={{ fontFamily: 'DM Mono, monospace' }}>
                {LABELS[i]}
              </text>
            )
          })}

          {cursorX !== null && (
            <line x1={cursorX} y1={0} x2={cursorX} y2={H} stroke="var(--border-mid)" strokeWidth="1" strokeDasharray="2 3" opacity={0.7}/>
          )}
          {sqrtIdx !== null && (
            <circle cx={sqrtX(DURATIONS[sqrtIdx])} cy={yOf(mmp[sqrtIdx])} r="4" fill="#6366f1"/>
          )}
          {sqrtIdx !== null && recordCurve && recordCurve[sqrtIdx] > 0 && (
            <circle cx={sqrtX(DURATIONS[sqrtIdx])} cy={yOf(recordCurve[sqrtIdx])} r="3.5" fill="#ef4444" opacity="0.8"/>
          )}
        </svg>

        {/* MMP tooltip — refondu : header large + Séance + Record + Δ + zone FTP */}
        {sqrtIdx !== null && mmpMousePos && (() => {
          const sessW = mmp[sqrtIdx]
          const recW  = recordCurveSmooth?.[sqrtIdx] ?? 0
          const delta = sessW - recW
          const tpct  = recW > 0 ? Math.round((sessW / recW) * 100) : null
          const isBeat = recW > 0 && sessW > recW
          const zone   = getPowerZone(sessW, ftp ?? null)
          const ftpPct = ftp && ftp > 0 ? Math.round((sessW / ftp) * 100) : null
          return (
            <div style={{
              position:      'absolute',
              left:          Math.max(4, Math.min((mmpContainerRef.current?.clientWidth ?? 400) - 200, mmpMousePos.x + 14)),
              top:           Math.max(4, mmpMousePos.y - 110),
              background:    'var(--bg-card)',
              border:        '1px solid var(--border)',
              borderRadius:  10,
              padding:       '10px 12px',
              fontSize:      11,
              boxShadow:     '0 4px 20px rgba(0,0,0,0.45)',
              pointerEvents: 'none',
              zIndex:        20,
              whiteSpace:    'nowrap',
              minWidth:      180,
              fontFamily:    'Inter, system-ui, -apple-system, sans-serif',
            }}>
              {/* Header durée large + record battu badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{
                  fontSize:       14,
                  fontWeight:     700,
                  color:          'var(--text)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtDuration(DURATIONS[sqrtIdx])}
                </span>
                {isBeat && (
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    background: '#10b981', color: '#fff',
                    padding: '2px 6px', borderRadius: 4,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>🏆 Record</span>
                )}
              </div>

              {/* Séance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1' }} />
                <span style={{ flex: 1, color: 'var(--text-dim)', opacity: 0.8 }}>Séance</span>
                <span style={{
                  color: '#6366f1', fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', fontSize: 13,
                }}>{sessW} W</span>
              </div>

              {/* Record */}
              {recW > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ flex: 1, color: 'var(--text-dim)', opacity: 0.8 }}>Record</span>
                  <span style={{
                    color: '#ef4444', fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums', fontSize: 13,
                  }}>{recW} W</span>
                </div>
              )}

              {/* Delta */}
              {recW > 0 && (
                <div style={{
                  fontSize:           10,
                  fontWeight:         600,
                  color:              isBeat ? '#10b981' : 'var(--text-dim)',
                  fontVariantNumeric: 'tabular-nums',
                  marginTop:          4,
                  paddingTop:         4,
                  borderTop:          '1px solid var(--border)',
                }}>
                  {delta > 0 ? '+' : ''}{delta} W {tpct !== null ? `(${tpct}% du record)` : ''}
                </div>
              )}

              {/* Zone FTP — affichée uniquement si FTP configurée */}
              {zone && ftpPct !== null && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginTop: 4, paddingTop: 4,
                  borderTop: recW > 0 ? 'none' : '1px solid var(--border)',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: zone.color }} />
                  <span style={{ flex: 1, color: 'var(--text-dim)', opacity: 0.8, fontSize: 10 }}>{zone.label}</span>
                  <span style={{
                    color: zone.color, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums', fontSize: 11,
                  }}>{ftpPct}% FTP</span>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Légende refondue : courbes + trophées + zones FTP si dispo */}
      <div style={{
        display:       'flex',
        flexWrap:      'wrap',
        alignItems:    'center',
        gap:           14,
        marginTop:     10,
        paddingTop:    10,
        borderTop:     '1px solid var(--border)',
        fontSize:      10,
        color:         'var(--text-dim)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 16, height: 2.5, background: '#6366f1', display: 'inline-block', borderRadius: 1 }}/>
          Cette séance
        </div>
        {recordCurve && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width:                    16,
              height:                   2,
              display:                  'inline-block',
              background:               'repeating-linear-gradient(to right, #ef4444 0, #ef4444 4px, transparent 4px, transparent 7px)',
            }}/>
            Record All Time
          </div>
        )}
        {recordBeatSegments.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 16, height: 4, background: '#10b981', display: 'inline-block', borderRadius: 2, opacity: 0.55 }}/>
            Record battu
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#06B6D4' }}>🏆</span> Année
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#eab308' }}>🏆</span> All Time
        </div>
        {ftp && ftp > 0 && (
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            color: 'var(--text-dim)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.05em',
          }}>
            Zones FTP {ftp} W
          </div>
        )}
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

// ─────────────────────────────────────────────────────────────
// INFO ACCORDION — boîte d'explication repliable
// ─────────────────────────────────────────────────────────────
function InfoAccordion({ title, summary, children }: {
  title:    string
  summary:  string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      marginTop: 20,
      padding: '14px 18px',
      background: 'var(--bg-card2)',
      border: '1px solid var(--border)',
      borderRadius: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{title}</span>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            fontSize: 12, color: '#06B6D4', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {open ? '▴ Réduire' : '▾ En savoir plus'}
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-body)', margin: '4px 0 0', lineHeight: 1.55 }}>
        {summary}
      </p>
      {open && (
        <div style={{
          borderTop: '1px solid var(--border)',
          marginTop: 10,
          paddingTop: 10,
          fontSize: 13,
          color: 'var(--text-body)',
          lineHeight: 1.6,
        }}>
          {children}
        </div>
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

      <div
        ref={decoupContainerRef}
        style={{
          position: 'relative', cursor: 'crosshair',
          background: 'var(--bg-card2)', borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}
          preserveAspectRatio="none"
          onMouseMove={handleDecoupMove} onMouseLeave={handleDecoupLeave}
          onTouchMove={e => { e.preventDefault(); onMove(e) }} onTouchEnd={onLeave}>
          {/* Profil altitude en arrière-plan (si dispo) */}
          {altitude && altitude.length > 1 && (() => {
            const altMin = Math.min(...altitude), altMax = Math.max(...altitude)
            const range = (altMax - altMin) || 1
            const pts = altitude.map((v, i) => {
              const x = (i / (altitude.length - 1)) * W
              const y = H - pad - ((v - altMin) / range) * (H - pad * 2)
              return `${x.toFixed(1)},${y.toFixed(1)}`
            })
            return <path d={`M0,${H}L${pts.join('L')}L${W},${H}Z`} fill="#94a3b8" fillOpacity={0.18} />
          })()}
          {/* Aires de remplissage cohérentes avec ActivityCurves */}
          <path d={buildNormPath(sWatts, wMin, wRange, true)} fill="#6366f1" fillOpacity={0.18} />
          <path d={buildNormPath(sWatts, wMin, wRange, false)} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round"/>
          <path d={buildNormPath(sHr, hMin, hRange, false)} fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" strokeDasharray="6,3"/>
          {sTemp && (
            <path d={buildNormPath(sTemp, tMin, tRange, false)} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" opacity="0.7"/>
          )}
          {pct !== null && (
            <line x1={pct * W} y1={0} x2={pct * W} y2={H} stroke="var(--border-mid)" strokeWidth="1"/>
          )}
        </svg>

        {/* Tooltip neutre multi-lignes, cohérent avec ActivityCurves */}
        {idx !== null && decoupMousePos && (
          <div data-chart-tooltip="" style={{
            position: 'absolute',
            left: decoupMousePos.x > 400 ? decoupMousePos.x - 170 : decoupMousePos.x + 12,
            top: Math.max(0, decoupMousePos.y - 90),
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 20,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}>
            {time && time[idx] != null && (
              <div style={{
                fontSize: 10, opacity: 0.6, textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 5, color: 'var(--text)',
              }}>
                {(() => { const t = time[idx] - time[0]; const m = Math.floor(t/60); const s = t%60; return `${m}:${String(s).padStart(2,'0')}` })()}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
              <span style={{ flex: 1, opacity: 0.65, color: 'var(--text)', fontSize: 11 }}>Puissance</span>
              <span style={{ fontWeight: 700, color: '#6366f1', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{Math.round(sWatts[idx])} W</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
              <span style={{ flex: 1, opacity: 0.65, color: 'var(--text)', fontSize: 11 }}>FC</span>
              <span style={{ fontWeight: 700, color: '#f97316', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{Math.round(sHr[idx])} bpm</span>
            </div>
            {altitude?.[idx] != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }} />
                <span style={{ flex: 1, opacity: 0.65, color: 'var(--text)', fontSize: 11 }}>Altitude</span>
                <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{Math.round(altitude[idx])} m</span>
              </div>
            )}
            {sTemp?.[idx] != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                <span style={{ flex: 1, opacity: 0.65, color: 'var(--text)', fontSize: 11 }}>Temp.</span>
                <span style={{ fontWeight: 700, color: '#10b981', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{Math.round(sTemp[idx])} °C</span>
              </div>
            )}
            {avgEF > 0 && sHr[idx] > 0 && (() => {
              const efNow = sWatts[idx] / sHr[idx]
              const d = ((efNow - avgEF) / avgEF) * 100
              const color = d >= 0 ? '#22c55e' : '#ef4444'
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                  <span style={{ flex: 1, opacity: 0.65, color: 'var(--text)', fontSize: 11 }}>EF Δ</span>
                  <span style={{ fontWeight: 700, color, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{d >= 0 ? '+' : ''}{d.toFixed(1)}%</span>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <TimelineBar totalS={totalS} cursorPct={pct} />

      <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
          <span style={{ width: 12, height: 2, background: '#6366f1', display: 'inline-block', borderRadius: 1 }}/>Puissance (normalisée)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
          <span style={{ width: 12, height: 2, background: '#f97316', display: 'inline-block', borderRadius: 1, borderTop: '2px dashed #f97316' }}/>FC (normalisée)
        </div>
        {sTemp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.textSub }}>
            <span style={{ width: 12, height: 2, background: '#6EE7B7', display: 'inline-block', borderRadius: 1 }}/>Température
          </div>
        )}
      </div>

      <InfoAccordion
        title="Dérive cardiaque"
        summary="Mesure comment votre FC évolue par rapport à votre puissance au fil de l'effort. Moins c'est élevé, meilleure est votre endurance aérobie."
      >
        <p style={{ margin: '0 0 12px' }}>
          La <strong style={{ color: 'var(--text)', fontWeight: 600 }}>dérive cardiaque</strong> mesure dans quelle mesure votre fréquence cardiaque augmente
          par rapport à votre production de puissance au cours d&apos;un effort. À puissance constante, si votre cœur doit battre de
          plus en plus vite pour maintenir le même effort, la dérive est positive.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '12px 0' }}>
          <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--zone-good-bg)', border: '1px solid var(--zone-good-border)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', margin: '0 0 3px' }}>{'< 5%'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>Excellent. Endurance aérobie bien développée.</p>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--zone-med-bg)', border: '1px solid var(--zone-med-border)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#D97706', margin: '0 0 3px' }}>5 – 8%</p>
            <p style={{ fontSize: 11, color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>Normal sur les longues sorties.</p>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--zone-bad-bg)', border: '1px solid var(--zone-bad-border)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', margin: '0 0 3px' }}>{'>  8%'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>Dérive importante. Base aérobie à renforcer.</p>
          </div>
        </div>
        <p style={{ margin: '10px 0 0' }}>
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Influence de la chaleur :</strong> au-delà de 30°C, l&apos;organisme redirige
          le flux sanguin vers la peau. Une dérive élevée par forte chaleur n&apos;est pas le signe d&apos;un manque d&apos;endurance — c&apos;est
          une réponse physiologique normale. Des études en conditions chaudes (35°C) montrent une augmentation de FC de{' '}
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>+11%</strong> et une chute du VO2max de{' '}
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>-15%</strong> sur 45 minutes comparé à 22°C.
        </p>
      </InfoAccordion>
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

      <div
        ref={containerRef2}
        style={{
          position: 'relative', cursor: 'crosshair',
          background: 'var(--bg-card2)', borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
          onTouchMove={e => { e.preventDefault(); onMove(e) }} onTouchEnd={onLeave}>
          <defs>
            <linearGradient id="hrCumFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#hrCumFill)"/>
          <path d={linePath} fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round"/>
          {pct !== null && (
            <line x1={pct * W} y1={0} x2={pct * W} y2={H} stroke="var(--border-mid)" strokeWidth="1"/>
          )}
        </svg>

        {/* Tooltip neutre multi-lignes, cohérent avec ActivityCurves */}
        {idx !== null && mousePos && (
          <div style={{
            position: 'absolute',
            left: Math.min(mousePos.x + 12, 999),
            top: Math.max(0, mousePos.y - 70),
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            whiteSpace: 'nowrap',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}>
            <div style={{
              fontSize: 10, opacity: 0.6, textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 5, color: 'var(--text)',
            }}>
              {bpmRange[idx]} bpm · {Math.round((Number(bpmRange[idx])/maxHrEst)*100)}% FC max
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
              <span style={{ flex: 1, opacity: 0.65, color: 'var(--text)', fontSize: 11 }}>Durée cumulée</span>
              <span style={{ fontWeight: 700, color: '#f97316', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmtCumTime(cumulative[idx])}</span>
            </div>
          </div>
        )}
      </div>

      {/* X axis — bpm labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {[minHr, ...Array.from({length:4},(_,i)=>Math.round(minHr+(maxHr-minHr)*(i+1)/5)), maxHr].map(bpm => (
          <span key={bpm} style={{ fontSize: 9, color: T.textMuted, fontFamily: T.fontMono }}>{bpm}</span>
        ))}
      </div>

      <InfoAccordion
        title="Durée cumulée par FC"
        summary="Temps total passé à chaque niveau de fréquence cardiaque. Plus la courbe descend lentement, plus vous avez accumulé de temps à haute intensité."
      >
        <p style={{ margin: '0 0 10px' }}>
          Ce graphique montre le temps total passé{' '}
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>à atteindre ou dépasser</strong> chaque
          niveau de fréquence cardiaque. La courbe descend de gauche à droite : plus la FC est élevée, moins vous y avez passé de temps.
        </p>
        <p style={{ margin: '0 0 10px' }}>
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Le seuil des 90% FCmax est crucial :</strong> c&apos;est dans cette zone
          que le système cardiovasculaire est soumis à sa plus forte sollicitation, forçant les adaptations
          qui font progresser le VO2max.
        </p>
        <p style={{ margin: 0 }}>
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Lecture :</strong> si le point à 160 bpm indique 1h30, vous avez passé
          1h30 à 160 bpm <em>ou plus</em>. Suivez ce chiffre à 90%+ FCmax d&apos;une séance à l&apos;autre pour quantifier vos gains de VO2max.
        </p>
      </InfoAccordion>
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
type BestWindow = { durationS: number; label: string; startIdx: number; endIdx: number; avgW: number; color: string }

function computeBestWindows(rawWatts: number[], N: number): BestWindow[] {
  const WINDOWS = [
    { durationS: 300,  label: "5'",  color: 'rgba(239,68,68,0.15)'  },
    { durationS: 1200, label: "20'", color: 'rgba(249,115,22,0.15)' },
    { durationS: 3600, label: "1h",  color: 'rgba(6,182,212,0.15)'  },
  ]
  return WINDOWS.filter(w => w.durationS <= N).map(w => {
    const len = w.durationS
    let sum = 0
    for (let i = 0; i < len && i < N; i++) sum += rawWatts[i]
    let bestAvg = sum / Math.min(len, N), bestStart = 0
    for (let i = len; i < N; i++) {
      sum += rawWatts[i] - rawWatts[i - len]
      const a = sum / len
      if (a > bestAvg) { bestAvg = a; bestStart = i - len + 1 }
    }
    return { ...w, startIdx: bestStart, endIdx: Math.min(N - 1, bestStart + len - 1), avgW: Math.round(bestAvg) }
  })
}

// ── Panneau de sélection (slide-up depuis le bas) ──────────────────
interface SelectionSheetProps {
  sel:         [number, number]
  activity:    Activity                       // pour réutiliser ActivityCurves avec streams sliced
  time:        number[]
  distance:    number[] | null
  watts:       number[] | null
  hr:          number[] | null
  velocity:    number[] | null
  alt:         number[] | null
  cadence:     number[] | null
  temp:        number[] | null
  ftp:         number | null
  hrZones?:    ParsedZone[]
  onClose:     () => void
}

// ── Zones de puissance Coggan (% FTP) — violet gradient pâle → foncé ──
const POWER_ZONES_DEF = [
  { z: 1, label: 'Z1', range: '<55%',    min: 0,    max: 0.55, color: '#ddd6fe' },
  { z: 2, label: 'Z2', range: '56-75%',  min: 0.55, max: 0.75, color: '#c4b5fd' },
  { z: 3, label: 'Z3', range: '76-90%',  min: 0.75, max: 0.90, color: '#a78bfa' },
  { z: 4, label: 'Z4', range: '91-105%', min: 0.90, max: 1.05, color: '#8b5cf6' },
  { z: 5, label: 'Z5', range: '106-120%',min: 1.05, max: 1.20, color: '#7c3aed' },
  { z: 6, label: 'Z6', range: '121-150%',min: 1.20, max: 1.50, color: '#6b21a8' },
  { z: 7, label: 'Z7', range: '>150%',   min: 1.50, max: 99,   color: '#581c87' },
]
const HR_ZONE_COLORS = ['#3b82f6', '#10b981', '#eab308', '#f97316', '#ef4444']
const HR_ZONE_NAMES  = ['Z1 Récup', 'Z2 Aérobie', 'Z3 Tempo', 'Z4 Seuil', 'Z5 VO2max']

// ── Tranches de température (°C) — 9 tranches (dont < 0 °C et > 35 °C) ──
const TEMP_ZONES_DEF: { label: string; min: number; max: number; color: string }[] = [
  { label: '< 0 °C',    min: -Infinity, max: 0,        color: '#1e1b4b' },
  { label: '0-5 °C',    min: 0,         max: 5,        color: '#312e81' },
  { label: '5-10 °C',   min: 5,         max: 10,       color: '#1e40af' },
  { label: '10-15 °C',  min: 10,        max: 15,       color: '#3b82f6' },
  { label: '15-20 °C',  min: 15,        max: 20,       color: '#06b6d4' },
  { label: '20-25 °C',  min: 20,        max: 25,       color: '#10b981' },
  { label: '25-30 °C',  min: 25,        max: 30,       color: '#eab308' },
  { label: '30-35 °C',  min: 30,        max: 35,       color: '#f97316' },
  { label: '> 35 °C',   min: 35,        max: Infinity, color: '#ef4444' },
]

// ── Tranches d'altitude (m) — donut trail (couleurs intuitives effort) ──
const ALTITUDE_ZONES_DEF: ParsedZone[] = [
  { label: '0-500 m',    min: -Infinity, max: 500,      color: '#10b981' },
  { label: '501-1000',   min: 500,       max: 1000,     color: '#84cc16' },
  { label: '1001-1500',  min: 1000,      max: 1500,     color: '#eab308' },
  { label: '1501-1800',  min: 1500,      max: 1800,     color: '#f97316' },
  { label: '1801-2000',  min: 1800,      max: 2000,     color: '#ef4444' },
  { label: '2001-2500',  min: 2000,      max: 2500,     color: '#7c2d12' },
  { label: '> 2500 m',   min: 2500,      max: Infinity, color: '#1e1b4b' },
]
const TEMP_ZONES_PARSED: ParsedZone[] = TEMP_ZONES_DEF.map(z => ({ label: z.label, min: z.min, max: z.max, color: z.color }))

// ── Tranches SPM aviron — donut, 0 exclu ──
const SPM_ROWING_ZONES_DEF: ParsedZone[] = [
  { label: '< 18',  min: 0.01, max: 18,       color: '#cbd5e1' },
  { label: '18-22', min: 18,   max: 22,       color: '#06b6d4' },
  { label: '22-26', min: 22,   max: 26,       color: '#10b981' },
  { label: '26-30', min: 26,   max: 30,       color: '#eab308' },
  { label: '30-34', min: 30,   max: 34,       color: '#f97316' },
  { label: '> 34',  min: 34,   max: Infinity, color: '#ef4444' },
]
// ── Tranches cadence natation (c/min) — donut, 0 exclu ──
const CADENCE_SWIM_ZONES_DEF: ParsedZone[] = [
  { label: '< 45',  min: 0.01, max: 45,       color: '#cbd5e1' },
  { label: '45-50', min: 45,   max: 50,       color: '#06b6d4' },
  { label: '50-55', min: 50,   max: 55,       color: '#10b981' },
  { label: '> 55',  min: 55,   max: Infinity, color: '#eab308' },
]
// ── Tranches de cadence running (spm) — donut, 0 exclu ──
const CADENCE_RUN_ZONES_DEF: ParsedZone[] = [
  { label: '< 150',   min: 0.01, max: 150,      color: '#94a3b8' },
  { label: '150-160', min: 150,  max: 160,      color: '#cbd5e1' },
  { label: '161-170', min: 160,  max: 170,      color: '#06b6d4' },
  { label: '171-180', min: 170,  max: 180,      color: '#10b981' },
  { label: '181-190', min: 180,  max: 190,      color: '#eab308' },
  { label: '> 190',   min: 190,  max: Infinity, color: '#f97316' },
]

// Intervalle d'échantillonnage (s) d'un flux d'activité.
function streamDt(s: { time?: number[] | null } | null | undefined, n: number): number {
  const t = s?.time
  if (t && t.length > 1 && n > 1) { const d = (t[t.length - 1] - t[0]) / (t.length - 1); if (d > 0) return d }
  return 1
}
// VAM (m/h) = D+ cumulé en montée (pente > 2 %) / temps passé en montée.
function trailVam(s: { altitude?: number[] | null; distance?: number[] | null; time?: number[] | null } | null | undefined): number {
  const alt = s?.altitude, dist = s?.distance
  if (!alt || !dist || alt.length < 2) return 0
  const n = Math.min(alt.length, dist.length)
  const dt = streamDt(s, n)
  let gain = 0, climbTime = 0
  for (let i = 1; i < n; i++) {
    const dd = dist[i] - dist[i - 1], da = alt[i] - alt[i - 1]
    if (dd > 0 && da / dd > 0.02) { gain += da; climbTime += dt }
  }
  return climbTime > 0 ? Math.round(gain / (climbTime / 3600)) : 0
}
// Temps (s) + % au-dessus d'un seuil d'altitude.
function trailTimeAbove(s: { altitude?: number[] | null; time?: number[] | null } | null | undefined, thr: number): { sec: number; pct: number } {
  const alt = s?.altitude
  if (!alt || !alt.length) return { sec: 0, pct: 0 }
  const dt = streamDt(s, alt.length)
  let above = 0
  for (const a of alt) if (a != null && a > thr) above += dt
  const total = alt.length * dt
  return { sec: above, pct: total > 0 ? Math.round((above / total) * 100) : 0 }
}

// Temps (s) passé par tranche pour un flux continu + intervalle d'échantillonnage.
function zoneTimesFromStream(stream: number[] | null | undefined, zones: ParsedZone[], dt: number): number[] {
  const times = zones.map(() => 0)
  if (!stream) return times
  for (const raw of stream) {
    if (raw == null || isNaN(raw)) continue
    for (let i = 0; i < zones.length; i++) {
      if (raw >= zones[i].min && raw < zones[i].max) { times[i] += dt; break }
    }
  }
  return times
}

// ── Tranches de cadence (rpm), 0 rpm exclu (roue libre) ──
const CADENCE_ZONES_DEF: { label: string; min: number; max: number; color: string }[] = [
  { label: '< 50 rpm',  min: 0.01, max: 50,       color: '#1e293b' },
  { label: '50-60 rpm', min: 50,   max: 60,       color: '#475569' },
  { label: '61-70 rpm', min: 60,   max: 70,       color: '#06b6d4' },
  { label: '71-80 rpm', min: 70,   max: 80,       color: '#3b82f6' },
  { label: '81-90 rpm', min: 80,   max: 90,       color: '#10b981' },
  { label: '91-100 rpm',min: 90,   max: 100,      color: '#eab308' },
  { label: '> 100 rpm', min: 100,  max: Infinity, color: '#f97316' },
]
const CADENCE_BIKE_ZONES_PARSED: ParsedZone[] = CADENCE_ZONES_DEF.map(z => ({ label: z.label, min: z.min, max: z.max, color: z.color }))

function _polarXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}
function _donutArcPath(cx: number, cy: number, rOut: number, rIn: number, startAng: number, endAng: number): string {
  const lg = endAng - startAng > Math.PI ? 1 : 0
  const os = _polarXY(cx, cy, rOut, startAng), oe = _polarXY(cx, cy, rOut, endAng)
  const is = _polarXY(cx, cy, rIn, startAng),  ie = _polarXY(cx, cy, rIn, endAng)
  return [
    `M ${os.x.toFixed(2)} ${os.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${lg} 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)}`,
    `L ${ie.x.toFixed(2)} ${ie.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${lg} 0 ${is.x.toFixed(2)} ${is.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

interface ZoneArc { label: string; pct: number; color: string }
function ZoneDonut({ data, title }: { data: ZoneArc[]; title: string }) {
  const totalPct = data.reduce((s, d) => s + d.pct, 0)
  const titleStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--text-dim)',
    marginBottom: 12, textAlign: 'center',
  }
  if (totalPct <= 0) return null    // PAS de placeholder '—' : on retire le donut entier
  const CX = 50, CY = 50, R_OUT = 45, R_IN = 32
  let cum = 0
  const visible = data.filter(d => d.pct > 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={titleStyle}>{title}</div>
      <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke="var(--bg-card2)" strokeWidth={R_OUT - R_IN} />
        {visible.length === 1 ? (
          // Une seule zone (100 %) : un arc plein-cercle ne se rend pas (point
          // de départ = point d'arrivée) → on dessine un anneau complet.
          <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke={visible[0].color} strokeWidth={R_OUT - R_IN} />
        ) : data.map((d, i) => {
          if (d.pct <= 0) return null
          const startAng = -Math.PI / 2 + (cum / totalPct) * 2 * Math.PI
          const endAng   = -Math.PI / 2 + ((cum + d.pct) / totalPct) * 2 * Math.PI
          cum += d.pct
          return <path key={i} d={_donutArcPath(CX, CY, R_OUT, R_IN, startAng, endAng)} fill={d.color} />
        })}
      </svg>
      <ul style={{
        listStyle: 'none', margin: 0, padding: 0,
        width: '100%',
        display: 'flex', flexDirection: 'column', gap: 3,
        fontSize: 10, color: 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {visible.map((d, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{Math.round((d.pct / totalPct) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SelectionSheet(props: SelectionSheetProps) {
  const { sel, activity, time, distance, watts, hr, velocity, alt, cadence, temp, ftp, hrZones, onClose } = props
  const [closing, setClosing] = useState(false)

  const [i1, i2] = sel
  const len = Math.max(1, i2 - i1 + 1)
  const dur = time[i2] - time[i1]

  function handleClose() { setClosing(true); setTimeout(onClose, 250) }

  const sliceOf = (arr: number[] | null | undefined) => (arr ? arr.slice(i1, i2 + 1) : null)
  const wS = sliceOf(watts)
  const hrS = sliceOf(hr)
  const vRaw = sliceOf(velocity)
  const vS = vRaw ? vRaw.map(v => v * 3.6) : null            // km/h
  const aS = sliceOf(alt)
  const cS = sliceOf(cadence)
  const tS = sliceOf(temp)

  const distM = distance ? distance[i2] - distance[i1] : null

  const avgOf = (a: number[] | null) => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
  const maxOf = (a: number[] | null) => (a && a.length ? Math.max(...a) : null)
  const minOf = (a: number[] | null) => (a && a.length ? Math.min(...a) : null)

  // Watts normalisés du segment (NP = (moy des moyennes glissantes 30s ^4) ^ 1/4)
  const npSeg = (() => {
    if (!wS || wS.length < 30) return null
    const roll: number[] = []
    for (let i = 29; i < wS.length; i++) {
      let s = 0
      for (let j = i - 29; j <= i; j++) s += wS[j]
      roll.push(s / 30)
    }
    if (!roll.length) return null
    const mean4 = roll.reduce((a, b) => a + Math.pow(b, 4), 0) / roll.length
    return Math.round(Math.pow(mean4, 0.25))
  })()

  // D+ / D-
  let dPlus = 0, dMinus = 0
  if (aS) for (let i = 1; i < aS.length; i++) { const d = aS[i] - aS[i - 1]; if (d > 0) dPlus += d; else dMinus += -d }

  // Roue libre (cadence = 0)
  let freeCount = 0
  if (cS) cS.forEach(c => { if (c <= 0) freeCount++ })
  const freePct = cS && cS.length ? freeCount / cS.length : null
  const freeDur = freePct != null ? dur * freePct : null

  const fmtDuration = (s: number): string => {
    if (s == null || !isFinite(s)) return '—'
    const m = Math.floor(s / 60), sec = Math.round(s % 60)
    if (m < 60) return `${m}m ${String(sec).padStart(2, '0')}s`
    const h = Math.floor(m / 60), rm = m % 60
    return `${h}h ${String(rm).padStart(2, '0')}m`
  }
  const fmtClock = (s: number): string => {
    const m = Math.floor(s / 60), sec = Math.round(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }
  const v = (x: number | null | undefined, unit: string, d = 0): string =>
    x == null || !isFinite(x) ? '—' : `${d ? x.toFixed(d).replace('.', ',') : Math.round(x)} ${unit}`

  // ── Groupes de stats ──
  const groups: { title: string; items: { label: string; value: string }[] }[] = [
    { title: 'Effort', items: [
      { label: 'Durée',        value: fmtDuration(dur) },
      { label: 'Distance',     value: distM != null ? `${(distM / 1000).toFixed(2).replace('.', ',')} km` : '—' },
      { label: 'Vitesse moy.', value: v(avgOf(vS), 'km/h', 1) },
      { label: 'Vitesse max.', value: v(maxOf(vS), 'km/h', 1) },
    ] },
    { title: 'Puissance', items: [
      { label: 'Watts moy.',        value: v(avgOf(wS), 'W') },
      { label: 'Watts max.',        value: v(maxOf(wS), 'W') },
      { label: 'Watts normalisés',  value: v(npSeg, 'W') },
      { label: 'W/kg',              value: '—' },
    ] },
    { title: 'Cadence', items: [
      { label: 'Cadence moy.', value: v(avgOf(cS), 'rpm') },
      { label: 'Cadence max.', value: v(maxOf(cS), 'rpm') },
      { label: 'Roue libre',   value: freeDur != null ? `${fmtClock(freeDur)} (${Math.round((freePct ?? 0) * 100)} %)` : '—' },
    ] },
    { title: 'Terrain', items: [
      { label: 'D+',           value: aS ? `+${Math.round(dPlus)} m` : '—' },
      { label: 'D−',           value: aS ? `−${Math.round(dMinus)} m` : '—' },
      { label: 'Altitude max.',value: v(maxOf(aS), 'm') },
      { label: 'Altitude moy.',value: v(avgOf(aS), 'm') },
    ] },
    { title: 'Température', items: [
      { label: 'Temp. moy.', value: v(avgOf(tS), '°C') },
      { label: 'Temp. max.', value: v(maxOf(tS), '°C') },
      { label: 'Temp. min.', value: v(minOf(tS), '°C') },
    ] },
  ]

  // ── Diagnostic Puissance — log conditions de calcul (gardé pour traçabilité) ──
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[SelectionSheet][DIAG Power]', {
      hasStreams: !!activity.streams,
      streamsKeys: activity.streams ? Object.keys(activity.streams) : [],
      wattsSamples: wS?.slice(0, 5),
      wattsLen: wS?.length ?? 0,
      ftp,
      ftp_at_time: activity.ftp_at_time,
      hasAnyPositive: wS?.some(w => w != null && w > 0) ?? false,
    })
  }

  // ── Données puissance présentes ? ──
  const hasPowerData = !!wS && wS.length > 0 && wS.some(w => w != null && w > 0)
  // Running : on n'affiche jamais la puissance (watts / W/kg / NP), même si la
  // montre en fournit — données non pertinentes pour la course à pied.
  const isRunSel = ['run', 'trail_run'].includes(activity.sport_type)
  const showPower = hasPowerData && !isRunSel

  // ── Zones de PUISSANCE (7 zones Coggan) — fallback FTP 200 W si non défini ──
  const ftpForZones = (ftp && ftp > 0) ? ftp : 200
  const pwDist: ZoneArc[] = (() => {
    if (!hasPowerData) return []
    const counts = POWER_ZONES_DEF.map(() => 0)
    wS!.forEach(w => {
      if (w == null || isNaN(w)) return
      const r = w / ftpForZones
      for (let i = 0; i < POWER_ZONES_DEF.length; i++) {
        if (r < POWER_ZONES_DEF[i].max) { counts[i]++; break }
      }
    })
    const tot = wS!.length || 1
    return POWER_ZONES_DEF.map((z, i) => ({
      label: z.label, pct: (counts[i] / tot) * 100, color: z.color,
    }))
  })()

  // ── Zones FC ── (5 zones depuis hrZones config user, sinon fallback 5 buckets %max)
  const hrDist: ZoneArc[] = (() => {
    if (!hrS || hrS.length === 0) return []
    let buckets: { min: number; max: number; label: string; color: string }[] = []
    if (hrZones && hrZones.length >= 5) {
      buckets = hrZones.slice(0, 5).map((z, idx) => ({
        min:   z.min,
        max:   idx === 4 ? Infinity : (z.max ?? Infinity),
        label: z.label || HR_ZONE_NAMES[idx],
        color: HR_ZONE_COLORS[idx],
      }))
    } else {
      const hrMax = Math.max(...hrS)
      const thresholds = [0.6, 0.7, 0.8, 0.9].map(p => p * hrMax)
      buckets = HR_ZONE_NAMES.map((name, idx) => ({
        min:   idx === 0 ? 0 : thresholds[idx - 1],
        max:   idx === 4 ? Infinity : thresholds[idx],
        label: name,
        color: HR_ZONE_COLORS[idx],
      }))
    }
    const counts = buckets.map(() => 0)
    hrS.forEach(h => {
      for (let i = 0; i < buckets.length; i++) {
        if (h < buckets[i].max) { counts[i]++; break }
      }
    })
    const tot = hrS.length || 1
    return buckets.map((b, i) => ({ label: b.label, pct: (counts[i] / tot) * 100, color: b.color }))
  })()

  // ── Présence de données température + cadence ──
  const hasTempData = !!tS && tS.length > 0 && tS.some(v => v != null && !isNaN(v))
  const hasCadData  = !!cS && cS.length > 0 && cS.some(v => v != null && !isNaN(v) && v > 0)
  const hasHrData   = !!hrS && hrS.length > 0 && hrS.some(v => v != null && !isNaN(v) && v > 0)

  // ── Tranches de TEMPÉRATURE (°C) ──
  const tempDist: ZoneArc[] = (() => {
    if (!hasTempData) return []
    const counts = TEMP_ZONES_DEF.map(() => 0)
    tS!.forEach(t => {
      if (t == null || isNaN(t)) return
      for (let i = 0; i < TEMP_ZONES_DEF.length; i++) {
        const def = TEMP_ZONES_DEF[i]
        if (t >= def.min && t < def.max) { counts[i]++; break }
      }
    })
    const tot = (tS!.filter(t => t != null && !isNaN(t)).length) || 1
    return TEMP_ZONES_DEF.map((d, i) => ({ label: d.label, pct: (counts[i] / tot) * 100, color: d.color }))
  })()

  // ── Tranches de CADENCE (rpm) — samples 0 rpm exclus (roue libre) ──
  const cadDist: ZoneArc[] = (() => {
    if (!hasCadData) return []
    const counts = CADENCE_ZONES_DEF.map(() => 0)
    let tot = 0
    cS!.forEach(c => {
      if (c == null || isNaN(c) || c <= 0) return     // exclut roue libre + capteur off
      tot++
      for (let i = 0; i < CADENCE_ZONES_DEF.length; i++) {
        const def = CADENCE_ZONES_DEF[i]
        if (c >= def.min && c < def.max) { counts[i]++; break }
      }
    })
    if (tot === 0) return []
    return CADENCE_ZONES_DEF.map((d, i) => ({ label: d.label, pct: (counts[i] / tot) * 100, color: d.color }))
  })()

  // ── Activity sliced pour réutiliser ActivityCurves ──
  const slicedActivity: Activity = {
    ...activity,
    streams: activity.streams ? {
      time:      activity.streams.time?.slice(i1, i2 + 1),
      distance:  activity.streams.distance?.slice(i1, i2 + 1),
      altitude:  activity.streams.altitude?.slice(i1, i2 + 1),
      heartrate: activity.streams.heartrate?.slice(i1, i2 + 1),
      velocity:  activity.streams.velocity?.slice(i1, i2 + 1),
      watts:     activity.streams.watts?.slice(i1, i2 + 1),
      cadence:   activity.streams.cadence?.slice(i1, i2 + 1),
      temp:      activity.streams.temp?.slice(i1, i2 + 1),
    } : null,
  }

  const subtitle = `${fmtClock(time[i1] - time[0])} → ${fmtClock(time[i2] - time[0])}${distM != null ? ` · ${(distM / 1000).toFixed(2).replace('.', ',')} km` : ''}`

  // ── Hero KPIs (4 stats principales, gros chiffre + unité) ──
  type Hero = { label: string; value: string; unit: string | null }
  const heroDistance: Hero  = distM != null
    ? { label: 'Distance', value: (distM / 1000).toFixed(2).replace('.', ','), unit: 'km' }
    : { label: 'Distance', value: '—', unit: null }
  const _wAvg = avgOf(wS)
  const _vAvg = avgOf(vS)
  const _hrAvg = avgOf(hrS)
  const heroPower: Hero = (showPower && _wAvg != null)
    ? { label: 'Puiss. moy.', value: `${Math.round(_wAvg)}`, unit: 'W' }
    : (_vAvg != null
        ? { label: 'Allure moy.', value: fmtClock(1000 / Math.max(0.1, _vAvg / 3.6)), unit: '/km' }
        : { label: 'Puiss. moy.', value: '—', unit: null })
  const heroHr: Hero = _hrAvg != null
    ? { label: 'FC moy.', value: `${Math.round(_hrAvg)}`, unit: 'bpm' }
    : { label: 'FC moy.', value: '—', unit: null }
  const heroSpeed: Hero = _vAvg != null
    ? { label: 'Vit. moy.', value: _vAvg.toFixed(1).replace('.', ','), unit: 'km/h' }
    : { label: 'Vit. moy.', value: '—', unit: null }
  const heroStats = [heroDistance, heroPower, heroHr, heroSpeed]

  // ── Détails compacts (4 colonnes catégorisées, lignes label/valeur) ──
  type Detail = { label: string; value: string }
  const _aMin = minOf(aS), _aMax = maxOf(aS), _aAvg = avgOf(aS)
  const _tMin = minOf(tS), _tMax = maxOf(tS), _tAvg = avgOf(tS)
  const colEffortDetails: Detail[] = [
    { label: 'Durée',     value: fmtDuration(dur) },
    { label: 'Vit. max',  value: v(maxOf(vS), 'km/h', 1) },
    { label: 'Roue libre',value: freeDur != null ? `${fmtClock(freeDur)} (${Math.round((freePct ?? 0) * 100)} %)` : '—' },
  ]
  const colPowerDetails: Detail[] = [
    { label: 'Watts max', value: v(maxOf(wS), 'W') },
    { label: 'NP',        value: v(npSeg, 'W') },
    { label: 'W/kg',      value: '—' },
  ]
  const colHrCadDetails: Detail[] = [
    { label: 'FC max',    value: v(maxOf(hrS), 'bpm') },
    { label: 'Cad. moy.', value: v(avgOf(cS), 'rpm') },
    { label: 'Cad. max',  value: v(maxOf(cS), 'rpm') },
  ]
  const colTerrainDetails: Detail[] = [
    { label: 'D+ / D−',   value: aS ? `+${Math.round(dPlus)} / −${Math.round(dMinus)} m` : '—' },
    { label: 'Alt. moy/max', value: (_aAvg != null && _aMax != null) ? `${Math.round(_aAvg)} / ${Math.round(_aMax)} m` : '—' },
    { label: 'T moy/max', value: (_tAvg != null && _tMax != null && _tMin != null) ? `${Math.round(_tAvg)} / ${Math.round(_tMax)} °C` : '—' },
  ]
  // Colonnes affichées : Puissance retirée pour la course à pied.
  const detailColumns: { title: string; rows: Detail[] }[] = [
    { title: 'Effort', rows: colEffortDetails },
    ...(showPower ? [{ title: 'Puissance', rows: colPowerDetails }] : []),
    { title: 'FC & Cadence', rows: colHrCadDetails },
    { title: 'Terrain & Temp.', rows: colTerrainDetails },
  ]

  // ── Styles partagés ──
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10,
  }
  const HeroCell = ({ stat, last }: { stat: Hero; last: boolean }) => (
    <div style={{
      textAlign: 'center',
      padding: '0 12px',
      borderRight: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--text-dim)', fontWeight: 600, marginBottom: 8,
      }}>{stat.label}</div>
      <div style={{
        fontSize: 36, fontWeight: 600, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color: stat.value === '—' ? 'var(--text-dim)' : 'var(--text)',
      }}>
        {stat.value}
        {stat.unit && (
          <span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 500, marginLeft: 4 }}>
            {stat.unit}
          </span>
        )}
      </div>
    </div>
  )
  const DetailLine = ({ label, value }: Detail) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '4px 0', fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{
        fontWeight: 600, color: 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
      }}>{value}</span>
    </div>
  )

  // Compte les donuts visibles pour ajuster le layout
  const visibleDonuts: { title: string; data: ZoneArc[] }[] = []
  if (hasHrData)    visibleDonuts.push({ title: 'Répartition FC',          data: hrDist   })
  if (showPower)    visibleDonuts.push({ title: 'Répartition Puissance',   data: pwDist   })
  if (hasTempData)  visibleDonuts.push({ title: 'Répartition Température', data: tempDist })
  if (hasCadData)   visibleDonuts.push({ title: 'Répartition Cadence',     data: cadDist  })

  // Sheet rendu via portal sur document.body pour échapper à tout containing
  // block créé par un ancêtre transformé (ex: bottom-sheet de l'activité).
  const sheetNode = (
    <>
      {/* Animations + responsive grids — injectés via le portal car SyncCharts
          (qui hébergeait ces règles auparavant) n'est plus monté. */}
      <style>{`
        @keyframes selSheetFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes selSheetFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes selSheetUp      { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes selSheetDown    { from { transform: translateY(0) } to { transform: translateY(100%) } }
        .sel-sheet-in           { animation: selSheetUp 300ms ease-out; }
        .sel-sheet-out          { animation: selSheetDown 250ms ease-in forwards; }
        .sel-sheet-overlay-in   { animation: selSheetFadeIn 300ms ease-out; }
        .sel-sheet-overlay-out  { animation: selSheetFadeOut 250ms ease-in forwards; }
        /* Grilles : repeat(2) sur petit, repeat(4) sur ≥ 1024px */
        .sel-hero-grid    { grid-template-columns: repeat(2, 1fr); row-gap: 24px; }
        .sel-details-grid { grid-template-columns: 1fr; }
        .sel-donuts-grid  { grid-template-columns: 1fr; }
        @media (min-width: 640px) {
          .sel-details-grid { grid-template-columns: repeat(2, 1fr); }
          .sel-donuts-grid  { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .sel-hero-grid    { grid-template-columns: repeat(4, 1fr); row-gap: 0; }
          .sel-details-grid { grid-template-columns: repeat(${detailColumns.length}, 1fr); }
          .sel-donuts-grid  { grid-template-columns: repeat(${Math.max(1, visibleDonuts.length)}, 1fr); }
        }
      `}</style>
      <div
        onClick={handleClose}
        className={closing ? 'sel-sheet-overlay-out' : 'sel-sheet-overlay-in'}
        style={{
          position:             'fixed',
          inset:                0,
          zIndex:               600,
          background:           'rgba(0,0,0,0.4)',
          backdropFilter:       'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />
      <div
        className={closing ? 'sel-sheet-out' : 'sel-sheet-in'}
        style={{
          position:     'fixed', left: 0, right: 0, bottom: 0, zIndex: 601,
          background:   'var(--bg)',
          borderRadius: '16px 16px 0 0',
          boxShadow:    '0 10px 40px rgba(0,0,0,0.3)',
          maxHeight:    '90vh',
          overflowY:    'auto',
          paddingBottom: 24,
          fontFamily:   'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Handle */}
        <div
          style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', cursor: 'pointer' }}
          onClick={handleClose}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '14px 28px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15 }}>
              Sélection — {fmtDuration(dur)}
            </div>
            <div style={{
              fontSize: 13, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums',
            }}>
              {subtitle}
            </div>
          </div>
          <button
            onClick={handleClose} aria-label="Fermer"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', fontSize: 18, lineHeight: 1, padding: 6,
              width: 32, height: 32,
            }}
          >✕</button>
        </div>

        {/* HERO KPIs — 4 stats principales gros chiffre + unité */}
        <div
          className="sel-hero-grid"
          style={{
            display: 'grid', gap: 0,
            padding: 28,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {heroStats.map((s, i) => (
            <HeroCell key={s.label} stat={s} last={i === heroStats.length - 1} />
          ))}
        </div>

        {/* DÉTAILS COMPACTS — colonnes catégorisées (Puissance masquée en running) */}
        <div
          className="sel-details-grid"
          style={{
            display: 'grid', gap: 32,
            padding: '24px 28px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {detailColumns.map(col => (
            <div key={col.title}>
              <div style={sectionTitleStyle}>{col.title}</div>
              {col.rows.map(d => <DetailLine key={d.label} {...d} />)}
            </div>
          ))}
        </div>

        {/* DONUTS — FC / Puissance / Température / Cadence (masquage auto si pas de data) */}
        {visibleDonuts.length > 0 && (
          <div
            className="sel-donuts-grid"
            style={{
              display: 'grid', gap: 24,
              padding: 28,
              borderBottom: '1px solid var(--border)',
            }}
          >
            {visibleDonuts.map(d => (
              <ZoneDonut key={d.title} title={d.title} data={d.data} />
            ))}
          </div>
        )}

        {/* COURBES — réutilisation ActivityCurves sur la portion sélectionnée */}
        <div style={{ padding: 28 }}>
          <ActivityCurves activity={slicedActivity} />
        </div>
      </div>
    </>
  )

  // SSR-safe : ne rend que côté client. Portal sur document.body pour
  // s'extraire de tout ancêtre transformé (containing-block fixed).
  if (typeof document === 'undefined') return null
  return createPortal(sheetNode, document.body)
}

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
  // Zone de tracé (offset gauche + largeur, relatifs au container) — pour aligner
  // le curseur et la bande de sélection sur les courbes (la col. gauche desktop
  // décale le plot par rapport au container).
  const [plotBox, setPlotBox]       = useState<{left:number;width:number}|null>(null)
  const [isOverCharts, setIsOverCharts] = useState(false)
  const [inPlot, setInPlot]         = useState(false)
  const [selection, setSelection]   = useState<[number,number] | null>(null)
  const [dragStartPct, setDragStartPct] = useState<number | null>(null)
  const [selectedLap, setSelectedLap]   = useState<number | null>(null)
  const [showSelModal, setShowSelModal]  = useState(false)
  const [hoveredWin, setHoveredWin]     = useState<BestWindow | null>(null)
  const containerRef   = useRef<HTMLDivElement>(null)
  const tracksAreaRef  = useRef<HTMLDivElement>(null)
  const handleMoveRef  = useRef<(clientX: number, clientY: number) => void>(() => {})

  // Distances cumulées le long du tracé polyline (pour mapping curseur → GPS)
  const polyCumDist = useMemo(
    () => polylinePoints && polylinePoints.length > 1 ? buildCumDist(polylinePoints) : null,
    [polylinePoints],
  )

  // Best effort windows (5', 20', 1h) sur la courbe de puissance
  const bestWindows = useMemo<BestWindow[]>(() => {
    if (!isBike || !s.watts || s.watts.length < 60) return []
    return computeBestWindows(s.watts, N)
  }, [s.watts, N, isBike]) // eslint-disable-line react-hooks/exhaustive-deps

  const cursor = cursorPct !== null ? Math.min(N-1, Math.max(0, Math.round(cursorPct * (N-1)))) : null

  function getPct(clientX: number, el: Element): number {
    const rect = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  function handleMove(clientX: number, clientY: number) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMousePos({ x: clientX - rect.left, y: clientY - rect.top })
    // Zone de tracé réelle = 1er <svg> dans tracksAreaRef (exclut la left-col)
    const firstSvg = tracksAreaRef.current?.querySelector('svg') as SVGElement | null
    const chartRect = firstSvg
      ? firstSvg.getBoundingClientRect()
      : (tracksAreaRef.current ?? containerRef.current).getBoundingClientRect()
    setPlotBox({ left: chartRect.left - rect.left, width: chartRect.width })
    // pct brut (non clampé) → détecte si le curseur est DANS la zone de tracé
    const rawPct = (clientX - chartRect.left) / chartRect.width
    setInPlot(rawPct >= 0 && rawPct <= 1)
    const pct = Math.min(1, Math.max(0, rawPct))
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
    // Détection meilleure fenêtre sous le curseur
    if (bestWindows.length > 0) {
      const hit = bestWindows.find(w => pct >= w.startIdx / (N-1) && pct <= w.endIdx / (N-1))
      setHoveredWin(hit ?? null)
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

  const selLap = selectedLap !== null && laps[selectedLap] ? laps[selectedLap] : null
  // X du curseur, ancré sur la zone de tracé (et non le container) → suit la souris.
  const cursorX = (plotBox && cursorPct !== null) ? plotBox.left + cursorPct * plotBox.width : (mousePos?.x ?? 0)

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
        /* Selection slide-up sheet */
        @keyframes selSheetFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes selSheetFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes selSheetUp      { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes selSheetDown    { from { transform: translateY(0) } to { transform: translateY(100%) } }
        .sel-sheet-in           { animation: selSheetUp 300ms ease-out; }
        .sel-sheet-out          { animation: selSheetDown 250ms ease-in forwards; }
        .sel-sheet-overlay-in   { animation: selSheetFadeIn 300ms ease-out; }
        .sel-sheet-overlay-out  { animation: selSheetFadeOut 250ms ease-in forwards; }
        /* Layout responsive du SelectionSheet — format 3 (hero + détails + 3 donuts) */
        .sel-hero-grid    { grid-template-columns: repeat(2, 1fr); row-gap: 24px; }
        .sel-details-grid { grid-template-columns: 1fr; }
        .sel-donuts-grid  { grid-template-columns: 1fr; }
        @media (min-width: 640px) {
          .sel-details-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .sel-hero-grid    { grid-template-columns: repeat(4, 1fr); row-gap: 0; }
          .sel-details-grid { grid-template-columns: repeat(4, 1fr); }
          .sel-donuts-grid  { grid-template-columns: repeat(3, 1fr); }
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
        {/* Cursor line — uniquement dans la zone de tracé effective */}
        {isOverCharts && inPlot && cursorPct !== null && mousePos !== null && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: cursorX,
            width: 1, background: T.text, pointerEvents: 'none', zIndex: 50,
          }} />
        )}

        {/* Selection overlay — ancrée sur la zone de tracé (offset col. gauche) */}
        {selection && plotBox && (() => {
          const f1 = selection[0] / (N-1)
          const f2 = selection[1] / (N-1)
          return (
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: plotBox.left + f1 * plotBox.width, width: (f2 - f1) * plotBox.width,
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

                    {/* Profil altimétrique en fond léger (gris) sur tous les tracks non-altitude */}
                    {alt && !track.isAlt && (
                      <path
                        d={buildFillPath(alt, track.H, 4, false)}
                        fill="rgba(148,163,184,0.15)"
                        pointerEvents="none"
                      />
                    )}

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

        {/* Unified cursor tooltip — uniquement dans la zone de tracé */}
        {isOverCharts && inPlot && cursor !== null && mousePos !== null && (
          <div
            data-chart-tooltip=""
            style={{
              position: 'absolute',
              left: (cursorPct ?? 0) > 0.75 ? cursorX - 160 : cursorX + 12,
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

        {/* Best window tooltip */}
        {hoveredWin && mousePos && !selection && (
          <div style={{
            position: 'absolute',
            left: (cursorPct ?? 0) > 0.75 ? cursorX - 175 : cursorX + 12,
            top: Math.max(4, mousePos.y - 56),
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: '7px 11px',
            pointerEvents: 'none',
            zIndex: 210,
            boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 }}>
              Meilleur {hoveredWin.label} : {hoveredWin.avgW} W
            </div>
            <div style={{ fontSize: 11, color: T.textSub }}>
              {(() => {
                const s0 = time[hoveredWin.startIdx] - time[0]
                const s1 = time[hoveredWin.endIdx]   - time[0]
                const fmt = (s: number) => {
                  const m = Math.floor(s / 60), sec = s % 60
                  if (m < 60) return `${m}'${String(sec).padStart(2,'0')}`
                  const h = Math.floor(m/60), rm = m%60
                  return `${h}h${String(rm).padStart(2,'0')}`
                }
                return `${fmt(s0)} – ${fmt(s1)}`
              })()}
            </div>
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

      {/* Selection slide-up sheet */}
      {showSelModal && selection && (
        <SelectionSheet
          sel={selection}
          activity={activity}
          time={time}
          distance={s.distance ?? null}
          watts={watts}
          hr={hr}
          velocity={velocity}
          alt={alt}
          cadence={cadence}
          temp={temp}
          ftp={activity.ftp_at_time ?? null}
          hrZones={hrZones}
          onClose={() => setShowSelModal(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ACTIVITY CURVES — section Courbes refondu (Empilé / Superposé)
// ─────────────────────────────────────────────────────────────
function smoothSeries(values: number[], windowSize: number): number[] {
  if (windowSize < 2) return values
  const half = Math.floor(windowSize / 2)
  const N = values.length
  const out: number[] = new Array(N)
  for (let i = 0; i < N; i++) {
    const start = Math.max(0, i - half)
    const end   = Math.min(N, i + half + 1)
    let sum = 0, cnt = 0
    for (let j = start; j < end; j++) {
      const v = values[j]
      if (v != null && !isNaN(v)) { sum += v; cnt++ }
    }
    out[i] = cnt > 0 ? sum / cnt : values[i]
  }
  return out
}

interface MetricDef {
  key:        'altitude' | 'hr' | 'watts' | 'speed' | 'vap' | 'cadence' | 'temp'
  label:      string
  unit:       string
  color:      string
  // Texte sur fond coloré (mobile tooltip) : noir si couleur claire, blanc si sombre
  textOnColor: '#000000' | '#ffffff'
  fmt:        (v: number) => string
}

// VAP stockée en km/h ajustée (géométrie « rapide = haut »), affichée en allure.
const vapFmt = (kmh: number) => kmh > 0 ? fmtPaceMinKm(kmhToPaceMin(kmh)) : '—'
const METRIC_DEFS: MetricDef[] = [
  { key: 'altitude', label: 'Altitude',     unit: 'm',    color: '#94a3b8', textOnColor: '#000000', fmt: v => `${Math.round(v)}` },
  { key: 'hr',       label: 'FC',           unit: 'bpm',  color: '#f97316', textOnColor: '#000000', fmt: v => `${Math.round(v)}` },
  { key: 'watts',    label: 'Puissance',    unit: 'W',    color: '#6366f1', textOnColor: '#ffffff', fmt: v => `${Math.round(v)}` },
  { key: 'speed',    label: 'Vitesse',      unit: 'km/h', color: '#06B6D4', textOnColor: '#000000', fmt: v => v.toFixed(1).replace('.', ',') },
  { key: 'vap',      label: 'VAP',          unit: '/km',  color: '#7c3aed', textOnColor: '#ffffff', fmt: vapFmt },
  { key: 'cadence',  label: 'Cadence',      unit: 'rpm',  color: '#ec4899', textOnColor: '#000000', fmt: v => `${Math.round(v)}` },
  { key: 'temp',     label: 'Température',  unit: '°C',   color: '#10B981', textOnColor: '#000000', fmt: v => `${Math.round(v)}` },
]

interface ActivityCurvesProps {
  activity: Activity
}

type CurvesFormat = 'stacked' | 'overlaid' | 'mono'

export function ActivityCurves({ activity }: ActivityCurvesProps) {
  void useWindowWidth() // force re-render au resize, mais on s'en sert pas autrement
  const s = activity.streams ?? null

  // ── Adaptation au sport ─────────────────────────────────────────────
  // Course à pied : pas de piste puissance, vitesse affichée en ALLURE
  // (min/km), cadence en spm. La donnée vitesse reste stockée en km/h
  // (géométrie « rapide = haut » naturelle) ; seul l'affichage change.
  const isRunSport  = ['run', 'trail_run'].includes(activity.sport_type)
  const isRowSport  = activity.sport_type === 'rowing'
  const isSwimSport = activity.sport_type === 'swim'
  const metricDefs = useMemo<MetricDef[]>(() => {
    if (!isRunSport && !isRowSport && !isSwimSport) return METRIC_DEFS
    return METRIC_DEFS.map(d => {
      if (d.key === 'speed') {
        if (isRunSport)  return { ...d, label: 'Allure', unit: '/km',  color: '#10B981', fmt: (kmh: number) => kmh > 0 ? fmtPaceMinKm(kmhToPaceMin(kmh)) : '—' }
        if (isRowSport)  return { ...d, label: 'Split',  unit: '/500', color: '#06B6D4', fmt: (kmh: number) => kmh > 0 ? formatSplit(speedKmhToSplit500(kmh)) : '—' }
        if (isSwimSport) return { ...d, label: 'Allure', unit: '/100', color: '#0EA5E9', fmt: (kmh: number) => kmh > 0 ? formatPaceSwim(100 / (kmh / 3.6)) : '—' }
      }
      if (d.key === 'cadence') {
        if (isSwimSport) return { ...d, unit: 'c/min' }
        if (isRunSport || isRowSport) return { ...d, unit: 'spm' }
      }
      return d
    })
  }, [isRunSport, isRowSport, isSwimSport])
  const defOf = (key: MetricDef['key']) => metricDefs.find(d => d.key === key)!

  // ── Format + métriques actives + métrique mono — persistés localStorage ─
  const [format,        setFormat]        = useState<CurvesFormat>('stacked')
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set(['hr', 'watts', 'speed']))
  const [monoMetric,    setMonoMetric]    = useState<MetricDef['key']>('hr')
  useEffect(() => {
    if (typeof window === 'undefined') return
    const f = localStorage.getItem('activity-charts-format') as CurvesFormat | null
    if (f === 'stacked' || f === 'overlaid' || f === 'mono') setFormat(f)
    try {
      const m = JSON.parse(localStorage.getItem('activity-charts-overlaid-metrics') ?? '[]') as string[]
      if (Array.isArray(m) && m.length > 0) setActiveMetrics(new Set(m))
    } catch { /* default */ }
    const mm = localStorage.getItem('activity-charts-mono-metric') as MetricDef['key'] | null
    if (mm && METRIC_DEFS.some(d => d.key === mm)) setMonoMetric(mm)
  }, [])
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('activity-charts-format', format) }, [format])
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activity-charts-overlaid-metrics', JSON.stringify(Array.from(activeMetrics)))
    }
  }, [activeMetrics])
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('activity-charts-mono-metric', monoMetric) }, [monoMetric])

  // ── Drag-to-select (desktop uniquement) ─────────────────────────────
  const [selection, setSelection] = useState<[number, number] | null>(null)
  const [showSelModal, setShowSelModal] = useState(false)
  const isSelectingRef = useRef(false)
  const dragStartIdxRef = useRef<number | null>(null)

  // ── Détection desktop (souris + hover réel) ────────────────────────
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setIsDesktop(mq.matches)
    update()
    if (mq.addEventListener) mq.addEventListener('change', update)
    else mq.addListener(update)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update)
      else mq.removeListener(update)
    }
  }, [])

  // ── Préparation des séries (lissées, useMemo) ──────────────────────
  const series = useMemo(() => {
    if (!s) return null
    // Estime taille de la fenêtre de lissage à partir du stream time
    const time = s.time
    let dt = 1
    if (time && time.length > 10) {
      dt = (time[10] - time[0]) / 10
      if (dt <= 0) dt = 1
    }
    const win = Math.max(2, Math.round(30 / dt))   // fenêtre ~30s

    const altitude = s.altitude && s.altitude.length > 1 ? smoothSeries(s.altitude, win) : null
    const hr       = s.heartrate && s.heartrate.length > 1 ? smoothSeries(s.heartrate, win) : null
    const watts    = s.watts && s.watts.length > 1 ? smoothSeries(s.watts, win) : null
    const speed    = s.velocity && s.velocity.length > 1
      ? smoothSeries(s.velocity.map(v => v > 0 ? v * 3.6 : 0), win) : null
    const cadence  = s.cadence && s.cadence.length > 1 ? smoothSeries(s.cadence, win) : null
    const temp     = s.temp && s.temp.length > 1 ? smoothSeries(s.temp, win) : null

    // VAP (trail) : vitesse ajustée par la pente, en km/h, puis lissée.
    let vap: number[] | null = null
    if (isRunSport && s.velocity && s.velocity.length > 1 && s.altitude && s.altitude.length > 1) {
      let dist = s.distance
      if (!dist) { dist = []; let acc = 0; for (const v of s.velocity) { acc += v > 0 ? v : 0; dist.push(acc) } }
      vap = smoothSeries(computeVapKmh(s.velocity, s.altitude, dist), win)
    }

    return { altitude, hr, watts, speed, vap, cadence, temp, time: s.time ?? null, distance: s.distance ?? null }
  }, [s, isRunSport])

  // Métriques effectivement présentes (data non-null + au moins quelques valeurs > 0)
  const presentKeys = useMemo<MetricDef['key'][]>(() => {
    if (!series) return []
    const keys: MetricDef['key'][] = []
    if (series.altitude && series.altitude.some(v => v > 0)) keys.push('altitude')
    if (series.hr       && series.hr.some(v => v > 0))       keys.push('hr')
    // Course & natation : aucune donnée de puissance affichée (vélo/aviron : oui).
    if (!isRunSport && !isSwimSport && series.watts && series.watts.some(v => v > 0)) keys.push('watts')
    if (series.speed    && series.speed.some(v => v > 0))    keys.push('speed')
    if (isRunSport && series.vap && series.vap.some(v => v > 0)) keys.push('vap')
    if (series.temp     && series.temp.some(v => v > 0))     keys.push('temp')
    if (series.cadence  && series.cadence.some(v => v > 0))  keys.push('cadence')
    return keys
  }, [series, isRunSport, isSwimSport])

  // Si la métrique mono persistée n'est plus disponible (ex. watts en course),
  // bascule sur la première métrique présente.
  useEffect(() => {
    if (presentKeys.length > 0 && !presentKeys.includes(monoMetric)) setMonoMetric(presentKeys[0])
  }, [presentKeys, monoMetric])

  if (!series || presentKeys.length === 0) return null

  function getData(key: MetricDef['key']): number[] | null {
    if (!series) return null
    return series[key]
  }

  // Stats par métrique
  function stats(arr: number[] | null): { min: number; max: number; avg: number } | null {
    if (!arr || arr.length === 0) return null
    const valid = arr.filter(v => v != null && !isNaN(v) && v > 0)
    if (valid.length === 0) return null
    const min = Math.min(...valid)
    const max = Math.max(...valid)
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length
    return { min, max, avg }
  }

  const N = series.time?.length ?? series.altitude?.length ?? series.hr?.length ?? series.watts?.length ?? 0
  const totalDistKm = series.distance && series.distance.length > 0 ? series.distance[series.distance.length - 1] / 1000 : 0
  const totalSec = series.time && series.time.length > 0 ? series.time[series.time.length - 1] - series.time[0] : 0

  // X labels équidistants (4 ticks)
  const xLabels = useMemo(() => {
    if (totalDistKm <= 0) {
      const m = Math.floor(totalSec / 60)
      return [0, 0.25, 0.5, 0.75, 1].map(t => ({ pct: t, label: `${Math.round(m * t)} min` }))
    }
    return [0, 0.25, 0.5, 0.75, 1].map(t => ({
      pct:   t,
      label: t === 0 ? '0' : `${Math.round(totalDistKm * t)} km`,
    }))
  }, [totalDistKm, totalSec])

  // Stats par métrique (memoisé)
  const statsMap = useMemo<Record<string, { min: number; max: number; avg: number } | null>>(() => {
    const m: Record<string, { min: number; max: number; avg: number } | null> = {}
    presentKeys.forEach(k => { m[k] = stats(getData(k)) })
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, presentKeys])

  // ── Refs pour crosshair/tooltip (perf : pas de re-render au drag) ──
  const containerRef           = useRef<HTMLDivElement>(null)
  const crosshairRef           = useRef<HTMLDivElement>(null)
  const dotRefsMap             = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const tooltipRef             = useRef<HTMLDivElement>(null)
  const tooltipHeaderRef       = useRef<HTMLDivElement>(null)
  const tooltipValRefs         = useRef<Map<string, HTMLSpanElement | null>>(new Map())
  const tooltipMonoMainRef     = useRef<HTMLDivElement>(null)
  const tooltipMonoSubRef      = useRef<HTMLDivElement>(null)

  function fmtPosition(idx: number): string {
    const parts: string[] = []
    if (series?.distance && series.distance[idx] != null) {
      parts.push(`${(series.distance[idx] / 1000).toFixed(1).replace('.', ',')} km`)
    }
    if (series?.time && series.time[idx] != null) {
      const sec = Math.max(0, series.time[idx] - (series.time[0] ?? 0))
      const m = Math.floor(sec / 60)
      const sc = Math.floor(sec % 60)
      parts.push(`${m}:${String(sc).padStart(2, '0')}`)
    }
    return parts.join(' · ')
  }

  // Met à jour le DOM (crosshair + dots + tooltip) directement, SANS setState
  function updateAtPointer(clientX: number, clientY: number) {
    const cont = containerRef.current
    if (!cont) return
    const rect = cont.getBoundingClientRect()
    const x = clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    const idx = Math.round(ratio * (N - 1))

    // Crosshair
    if (crosshairRef.current) {
      crosshairRef.current.style.left    = `${ratio * 100}%`
      crosshairRef.current.style.opacity = '1'
    }
    // Dots (chacun positionné dans son row chart-area)
    dotRefsMap.current.forEach((dot, key) => {
      if (!dot) return
      const data = getData(key as MetricDef['key'])
      const st = statsMap[key]
      if (!data || !st) return
      const v = data[idx]
      if (v == null || isNaN(v)) { dot.style.opacity = '0'; return }
      const rangeV = (st.max - st.min) || 1
      const yRatio = (v - st.min) / rangeV
      dot.style.left    = `${ratio * 100}%`
      dot.style.top     = `${(1 - yRatio) * 100}%`
      dot.style.opacity = '1'
    })
    // Tooltip — Empilé/Superposé : header + valeurs
    if (tooltipHeaderRef.current) tooltipHeaderRef.current.textContent = fmtPosition(idx)
    tooltipValRefs.current.forEach((span, key) => {
      if (!span) return
      const data = getData(key as MetricDef['key'])
      const def  = defOf(key as MetricDef['key'])
      if (!data || !def) return
      const v = data[idx]
      span.textContent = v != null && !isNaN(v) ? `${def.fmt(v)} ${def.unit}` : '—'
    })
    // Tooltip — Mono : main + sub
    if (tooltipMonoMainRef.current) {
      const def = defOf(monoMetric)
      const data = def ? getData(def.key) : null
      if (def && data) {
        const v = data[idx]
        tooltipMonoMainRef.current.textContent = v != null && !isNaN(v) ? `${def.fmt(v)} ${def.unit}` : '—'
      }
    }
    if (tooltipMonoSubRef.current) tooltipMonoSubRef.current.textContent = fmtPosition(idx)
    // Tooltip wrapper
    if (tooltipRef.current) tooltipRef.current.style.opacity = '1'
    // Desktop : repositionne la bulle en position fixed à côté du curseur
    if (isDesktop && tooltipRef.current) {
      const bubble = tooltipRef.current
      const bw = bubble.offsetWidth
      const bh = bubble.offsetHeight
      let left = clientX + 12
      let top  = clientY + 12
      if (left + bw + 12 > window.innerWidth)  left = clientX - bw - 12
      if (top  + bh + 12 > window.innerHeight) top  = clientY - bh - 12
      left = Math.max(8, left)
      top  = Math.max(8, top)
      bubble.style.left = `${left}px`
      bubble.style.top  = `${top}px`
    }
  }

  function hideHint() {
    if (crosshairRef.current) crosshairRef.current.style.opacity = '0'
    dotRefsMap.current.forEach(dot => { if (dot) dot.style.opacity = '0' })
    if (tooltipRef.current) tooltipRef.current.style.opacity = '0'
  }

  // Helper : convertit clientX en indice de données
  function idxFromClientX(clientX: number): number {
    const cont = containerRef.current
    if (!cont) return 0
    const rect = cont.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * (N - 1))
  }

  // Handlers communs pointer (touch + mouse). PointerEvents unifie les 2.
  function onPointerDown(e: React.PointerEvent) {
    // Desktop : clic gauche démarre le drag-to-select
    if (isDesktop && e.pointerType === 'mouse' && e.button === 0) {
      isSelectingRef.current = true
      const idx = idxFromClientX(e.clientX)
      dragStartIdxRef.current = idx
      setSelection([idx, idx])
      setShowSelModal(false)
      hideHint()
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    updateAtPointer(e.clientX, e.clientY)
    // Capture pour drag continu hors zone (mobile)
    if (e.pointerType !== 'mouse') {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    // Drag-to-select actif : étend la sélection, pas de crosshair/tooltip
    if (isSelectingRef.current) {
      const idx = idxFromClientX(e.clientX)
      const start = dragStartIdxRef.current ?? idx
      setSelection([Math.min(start, idx), Math.max(start, idx)])
      return
    }
    updateAtPointer(e.clientX, e.clientY)
  }
  function onPointerLeaveOrUp() {
    if (isSelectingRef.current) {
      isSelectingRef.current = false
      dragStartIdxRef.current = null
      setSelection(cur => {
        if (cur && cur[1] - cur[0] > 5) {
          setShowSelModal(true)
          return cur
        }
        return null
      })
    }
    hideHint()
  }

  // Couleurs sémantiques fixes (pour le tooltip colored mono)
  const monoDef     = metricDefs.find(d => d.key === monoMetric) ?? metricDefs[1]
  const monoBg      = monoDef.color
  const monoTxtClr  = monoDef.textOnColor

  // ─────────────────────────────────────────────────────────────
  // TOGGLE FORMAT (Empilé / Superposé / Mono)
  // ─────────────────────────────────────────────────────────────
  const FormatToggle = (
    <div style={{
      display:      'inline-flex',
      gap:          2,
      padding:      3,
      borderRadius: 8,
      border:       '1px solid var(--border)',
      background:   'var(--bg-card2)',
      marginBottom: 12,
    }}>
      {([
        { id: 'stacked',  label: 'Empilé',     icon: <AlignJustify size={13} /> },
        { id: 'overlaid', label: 'Superposé',  icon: <LayoutGrid   size={13} /> },
        { id: 'mono',     label: 'Mono',       icon: <Square       size={13} /> },
      ] as const).map(o => {
        const active = format === o.id
        return (
          <button
            key={o.id}
            onClick={() => setFormat(o.id)}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          6,
              padding:      '7px 10px',
              borderRadius: 5,
              border:       'none',
              background:   active ? 'var(--bg-card)' : 'transparent',
              color:        active ? 'var(--text)' : 'var(--text-dim)',
              fontSize:     11,
              fontWeight:   active ? 700 : 500,
              cursor:       'pointer',
              transition:   'background 0.15s, color 0.15s',
              fontFamily:   'inherit',
            }}
          >
            {o.icon}
            <span>{o.label}</span>
          </button>
        )
      })}
    </div>
  )

  // Tooltip NEUTRE (Empilé / Superposé)
  const tooltipNeutralKeys = format === 'overlaid'
    ? presentKeys.filter(k => activeMetrics.has(k))
    : presentKeys
  const TooltipNeutralNode = (
    <div
      ref={tooltipRef}
      className="curves-tooltip-desktop"
      style={{
        opacity:       0,
        transition:    'opacity 0.15s',
        background:    'var(--bg-card)',
        border:        '1px solid var(--border)',
        borderRadius:  12,
        padding:       '10px 14px',
        boxShadow:     '0 4px 16px rgba(0,0,0,0.10)',
        pointerEvents: 'none',
        ...(isDesktop
          ? { position: 'fixed' as const, left: -9999, top: -9999, zIndex: 9999, marginBottom: 0 }
          : { position: 'static' as const, marginBottom: 10 }
        ),
      }}
    >
      <div ref={tooltipHeaderRef} style={{
        fontSize:       10,
        opacity:        0.6,
        textTransform:  'uppercase',
        letterSpacing:  '0.08em',
        marginBottom:   5,
        color:          'var(--text)',
      }}>—</div>
      {tooltipNeutralKeys.map(key => {
        const def = defOf(key)
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: def.color, flexShrink: 0 }} />
            <span style={{ flex: 1, opacity: 0.65, color: 'var(--text)', fontSize: 11 }}>{def.label}</span>
            <span
              ref={el => { tooltipValRefs.current.set(key, el) }}
              style={{
                fontWeight:         700,
                fontVariantNumeric: 'tabular-nums',
                color:              def.color,
                fontSize:           12,
              }}
            >—</span>
          </div>
        )
      })}
    </div>
  )

  // Sur desktop : portal vers document.body pour échapper à tout
  // containing block créé par un ancêtre transformé (sidebar, sheet, etc.).
  // Sur mobile : rendu inline en flow (style static).
  const TooltipNeutral =
    isDesktop && typeof document !== 'undefined'
      ? createPortal(TooltipNeutralNode, document.body)
      : TooltipNeutralNode

  // Tooltip COLORÉ (Mono)
  const TooltipColoredNode = (
    <div
      ref={tooltipRef}
      className="curves-tooltip-desktop"
      style={{
        opacity:       0,
        transition:    'opacity 0.15s',
        background:    monoBg,
        color:         monoTxtClr,
        borderRadius:  12,
        padding:       '12px 16px',
        boxShadow:     '0 4px 16px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
        ...(isDesktop
          ? { position: 'fixed' as const, left: -9999, top: -9999, zIndex: 9999, marginBottom: 0 }
          : { position: 'static' as const, marginBottom: 10 }
        ),
      }}
    >
      <div
        ref={tooltipMonoMainRef}
        style={{
          fontSize:           22,
          fontWeight:         700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >—</div>
      <div
        ref={tooltipMonoSubRef}
        style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}
      >—</div>
    </div>
  )
  const TooltipColored =
    isDesktop && typeof document !== 'undefined'
      ? createPortal(TooltipColoredNode, document.body)
      : TooltipColoredNode

  // Overlay rectangulaire de sélection (rendu absolu dans le wrapper de chart)
  const SelectionOverlay = selection && N > 1 ? (
    <div
      style={{
        position:      'absolute',
        top:           0,
        bottom:        0,
        left:          `${(selection[0] / (N - 1)) * 100}%`,
        width:         `${((selection[1] - selection[0]) / (N - 1)) * 100}%`,
        background:    'rgba(99, 102, 241, 0.15)',
        borderLeft:    '1px solid #6366f1',
        borderRight:   '1px solid #6366f1',
        pointerEvents: 'none',
        zIndex:        4,
      }}
    />
  ) : null

  // Sheet de stats portion sélectionnée (déjà portalisé sur document.body)
  const SelSheetNode =
    showSelModal && selection && s
      ? (
        <SelectionSheet
          sel={selection}
          activity={activity}
          time={s.time ?? []}
          distance={s.distance ?? null}
          watts={s.watts ?? null}
          hr={s.heartrate ?? null}
          velocity={s.velocity ?? null}
          alt={s.altitude ?? null}
          cadence={s.cadence ?? null}
          temp={s.temp ?? null}
          ftp={activity.ftp_at_time ?? null}
          onClose={() => {
            setShowSelModal(false)
            setSelection(null)
          }}
        />
      )
      : null

  const W = 1000
  const ROW_H = 70    // hauteur fixe par row (Format A collé)

  // Helper : path area pour une série donnée sur une hauteur H
  function buildAreaPath(data: number[], st: { min: number; max: number }, H: number, padT = 4, padB = 4): string {
    const range = (st.max - st.min) || 1
    const inner = H - padT - padB
    const pts = data.map((v, i) => {
      const x = (i / (N - 1)) * W
      const y = H - padB - ((v - st.min) / range) * inner
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M0,${H}L${pts.join('L')}L${W},${H}Z`
  }
  function buildLinePath(data: number[], st: { min: number; max: number }, H: number, padT = 4, padB = 4): string {
    const range = (st.max - st.min) || 1
    const inner = H - padT - padB
    const pts = data.map((v, i) => {
      const x = (i / (N - 1)) * W
      const y = H - padB - ((v - st.min) / range) * inner
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M${pts.join('L')}`
  }

  // ─────────────────────────────────────────────────────────────
  // FORMAT A — STACKED COLLÉ (6 courbes collées + colonne label gauche)
  // ─────────────────────────────────────────────────────────────
  if (format === 'stacked') {
    return (
      <div>
        {FormatToggle}
        {TooltipNeutral}

        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerLeaveOrUp}
          onPointerLeave={onPointerLeaveOrUp}
          onPointerCancel={onPointerLeaveOrUp}
          style={{
            display:      'flex',
            position:     'relative',
            background:   'var(--bg-card2)',
            borderRadius: 10,
            overflow:     'hidden',
            touchAction:  'none',
            cursor:       'crosshair',
          }}
        >
          {/* Colonne labels gauche */}
          <div style={{
            width:         60,
            flexShrink:    0,
            borderRight:   '1px solid var(--border)',
            background:    'var(--bg-card2)',
          }}>
            {presentKeys.map((key, i) => {
              const def = defOf(key)
              const st  = statsMap[key]
              return (
                <div key={key} style={{
                  height:        ROW_H,
                  padding:       '8px 6px',
                  display:       'flex',
                  flexDirection: 'column',
                  justifyContent:'center',
                  borderBottom:  i < presentKeys.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: def.color }}>
                    {def.label}
                  </span>
                  {st && (
                    <span style={{
                      fontSize:           9,
                      color:              'var(--text-dim)',
                      marginTop:          2,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {(key === 'vap' || ((isRunSport || isRowSport || isSwimSport) && key === 'speed'))
                        ? `${def.fmt(st.max)} – ${def.fmt(st.min)}`
                        : `${def.fmt(st.min)} – ${def.fmt(st.max)}`} {def.unit}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Colonne charts + crosshair */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            {SelectionOverlay}
            {/* Crosshair vertical traversant TOUS les rows */}
            <div
              ref={crosshairRef}
              style={{
                position:      'absolute',
                top:           0,
                bottom:        0,
                width:         1,
                background:    'var(--border-mid)',
                opacity:       0,
                pointerEvents: 'none',
                zIndex:        5,
                transition:    'opacity 0.1s',
              }}
            />
            {presentKeys.map((key, i) => {
              const def  = defOf(key)
              const data = getData(key)
              const st   = statsMap[key]
              if (!data || !st) return null
              const altData = series.altitude
              const altSt   = altData ? statsMap['altitude'] : null
              const altPath = altData && altSt ? buildAreaPath(altData, altSt, ROW_H) : ''
              const mainPath = buildAreaPath(data, st, ROW_H)
              return (
                <div
                  key={key}
                  style={{
                    height:       ROW_H,
                    position:     'relative',
                    borderBottom: i < presentKeys.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <svg
                    viewBox={`0 0 ${W} ${ROW_H}`}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    preserveAspectRatio="none"
                  >
                    {altPath && <path d={altPath} fill="#94a3b8" fillOpacity={0.18} />}
                    <path d={mainPath} fill={def.color} fillOpacity={key === 'altitude' ? 0.5 : 0.55} strokeLinejoin="round" />
                  </svg>
                  <div
                    ref={el => { dotRefsMap.current.set(key, el) }}
                    style={{
                      position:      'absolute',
                      width:         8,
                      height:        8,
                      borderRadius:  '50%',
                      background:    '#ffffff',
                      border:        '2px solid #0f172a',
                      transform:     'translate(-50%, -50%)',
                      opacity:       0,
                      pointerEvents: 'none',
                      zIndex:        6,
                      transition:    'opacity 0.1s',
                      left:          '0%',
                      top:           '50%',
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Labels axe X commun en bas */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '6px 2px 0 62px', fontSize: 9, color: 'var(--text-dim)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {xLabels.map((l, i) => <span key={i}>{l.label}</span>)}
        </div>
        {SelSheetNode}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // FORMAT C — MONO (1 grande courbe + pills sélecteur)
  // ─────────────────────────────────────────────────────────────
  if (format === 'mono') {
    const def = monoDef
    const monoH = 280
    const padT  = 8, padB = 8
    const data  = getData(def.key)
    const st    = statsMap[def.key]
    const altData = series.altitude
    const altSt   = altData ? statsMap['altitude'] : null
    const altPath = altData && altSt ? buildAreaPath(altData, altSt, monoH, padT, padB) : ''
    const mainPath = data && st ? buildAreaPath(data, st, monoH, padT, padB) : ''

    return (
      <div>
        {FormatToggle}

        {/* Pills sélecteur métrique */}
        <div style={{
          display:       'flex',
          gap:           6,
          overflowX:     'auto',
          paddingBottom: 4,
          marginBottom:  10,
          scrollbarWidth: 'none',
        }}>
          {metricDefs.filter(d => presentKeys.includes(d.key)).map(d => {
            const active = monoMetric === d.key
            return (
              <button
                key={d.key}
                onClick={() => setMonoMetric(d.key)}
                style={{
                  flexShrink:   0,
                  padding:      '7px 12px',
                  borderRadius: 999,
                  border:       '1px solid var(--border)',
                  background:   active ? 'var(--text)' : 'var(--bg-card2)',
                  color:        active ? 'var(--bg)'   : 'var(--text-dim)',
                  fontSize:     11,
                  fontWeight:   600,
                  cursor:       'pointer',
                  transition:   'background 0.15s, color 0.15s',
                  fontFamily:   'inherit',
                  whiteSpace:   'nowrap',
                }}
              >
                {d.label}
              </button>
            )
          })}
        </div>

        {TooltipColored}

        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerLeaveOrUp}
          onPointerLeave={onPointerLeaveOrUp}
          onPointerCancel={onPointerLeaveOrUp}
          style={{
            position:     'relative',
            height:       monoH,
            background:   'var(--bg-card2)',
            borderRadius: 10,
            overflow:     'visible',
            touchAction:  'none',
            cursor:       'crosshair',
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${monoH}`}
            style={{ width: '100%', height: '100%', display: 'block', borderRadius: 10 }}
            preserveAspectRatio="none"
          >
            {altPath && <path d={altPath} fill="#94a3b8" fillOpacity={0.2} />}
            {mainPath && (
              <path d={mainPath} fill={def.color} fillOpacity={0.65} strokeLinejoin="round" />
            )}
          </svg>
          {SelectionOverlay}
          <div
            ref={crosshairRef}
            style={{
              position:      'absolute',
              top:           0,
              bottom:        0,
              width:         1,
              background:    'var(--border-mid)',
              opacity:       0,
              pointerEvents: 'none',
              zIndex:        5,
              transition:    'opacity 0.1s',
            }}
          />
          <div
            ref={el => { dotRefsMap.current.set(def.key, el) }}
            style={{
              position:      'absolute',
              width:         10,
              height:        10,
              borderRadius:  '50%',
              background:    '#ffffff',
              border:        '2px solid #0f172a',
              transform:     'translate(-50%, -50%)',
              opacity:       0,
              pointerEvents: 'none',
              zIndex:        6,
              transition:    'opacity 0.1s',
              left:          '0%',
              top:           '50%',
            }}
          />
        </div>

        {/* Stats moy / max */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-around',
          padding:        '10px 0',
          borderTop:      '1px solid var(--border)',
          borderBottom:   '1px solid var(--border)',
          marginTop:      10,
        }}>
          {st ? (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Moyenne</div>
                <div style={{
                  fontSize:           16,
                  fontWeight:         700,
                  color:              def.color,
                  fontVariantNumeric: 'tabular-nums',
                  marginTop:          2,
                }}>{def.fmt(st.avg)} {def.unit}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Maximum</div>
                <div style={{
                  fontSize:           16,
                  fontWeight:         700,
                  color:              def.color,
                  fontVariantNumeric: 'tabular-nums',
                  marginTop:          2,
                }}>{def.fmt(st.max)} {def.unit}</div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>—</div>
          )}
        </div>

        {/* Labels axe X */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '6px 2px 0', fontSize: 9, color: 'var(--text-dim)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {xLabels.map((l, i) => <span key={i}>{l.label}</span>)}
        </div>
        {SelSheetNode}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // FORMAT B — OVERLAID (1 chart combiné + toggles)
  // ─────────────────────────────────────────────────────────────
  const overlaidH = 260
  const padT = 8, padB = 8
  // Altitude background path
  const altData = series.altitude
  const altSt   = altData ? statsMap['altitude'] : null
  const altPathO = altData && altSt ? buildAreaPath(altData, altSt, overlaidH, padT, padB) : ''

  return (
    <div>
      {FormatToggle}

      {/* Toggles métriques 3x2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
        marginBottom: 12,
      }}>
        {METRIC_DEFS.filter(d => presentKeys.includes(d.key)).map(def => {
          const active = activeMetrics.has(def.key)
          return (
            <button
              key={def.key}
              onClick={() => {
                const next = new Set(activeMetrics)
                if (active) next.delete(def.key)
                else next.add(def.key)
                setActiveMetrics(next)
              }}
              style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          6,
                padding:      '6px 8px',
                borderRadius: 6,
                border:       '1px solid var(--border)',
                background:   'var(--bg-card2)',
                color:        def.color,
                fontSize:     10,
                fontWeight:   600,
                cursor:       'pointer',
                opacity:      active ? 1 : 0.35,
                transition:   'opacity 0.15s',
                fontFamily:   'inherit',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: def.color }} />
              {def.label}
            </button>
          )
        })}
      </div>

      {TooltipNeutral}

      {/* Chart combiné */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerLeaveOrUp}
        onPointerLeave={onPointerLeaveOrUp}
        onPointerCancel={onPointerLeaveOrUp}
        style={{
          background:    'var(--bg-card2)',
          borderRadius:  10,
          overflow:      'visible',
          position:      'relative',
          height:        overlaidH,
          touchAction:   'none',
          cursor:        'crosshair',
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${overlaidH}`}
          style={{ width: '100%', height: '100%', display: 'block', borderRadius: 10 }}
          preserveAspectRatio="none"
        >
          {/* Grille subtile */}
          {[0.25, 0.5, 0.75].map(t => (
            <line
              key={t}
              x1={0} y1={overlaidH * t} x2={W} y2={overlaidH * t}
              stroke="var(--border)" strokeWidth="1" opacity={0.5}
            />
          ))}
          {/* Profil altitude arrière-plan (toujours visible) */}
          {altPathO && <path d={altPathO} fill="#94a3b8" fillOpacity={0.18} />}
          {/* Courbes lignes par métrique active */}
          {METRIC_DEFS.filter(d => activeMetrics.has(d.key) && presentKeys.includes(d.key)).map(def => {
            const data = getData(def.key)
            const st = statsMap[def.key]
            if (!data || !st) return null
            return (
              <path
                key={def.key}
                d={buildLinePath(data, st, overlaidH, padT, padB)}
                fill="none"
                stroke={def.color}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )
          })}
        </svg>
        {SelectionOverlay}
        {/* Crosshair */}
        <div
          ref={crosshairRef}
          style={{
            position:      'absolute',
            top:           0,
            bottom:        0,
            width:         1,
            background:    'var(--border-mid)',
            opacity:       0,
            pointerEvents: 'none',
            zIndex:        5,
            transition:    'opacity 0.1s',
          }}
        />
        {/* Dots pour chaque métrique active */}
        {METRIC_DEFS.filter(d => activeMetrics.has(d.key) && presentKeys.includes(d.key)).map(def => (
          <div
            key={def.key}
            ref={el => { dotRefsMap.current.set(def.key, el) }}
            style={{
              position:      'absolute',
              width:         9,
              height:        9,
              borderRadius:  '50%',
              background:    '#ffffff',
              border:        '2px solid #0f172a',
              transform:     'translate(-50%, -50%)',
              opacity:       0,
              pointerEvents: 'none',
              zIndex:        6,
              transition:    'opacity 0.1s',
              left:          '0%',
              top:           '50%',
            }}
          />
        ))}
      </div>

      {/* Labels axe X */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '6px 2px 0', fontSize: 9, color: 'var(--text-dim)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {xLabels.map((l, i) => <span key={i}>{l.label}</span>)}
      </div>
      {SelSheetNode}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION: DONNÉES
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// DONNÉES SPÉCIFIQUES PAR SPORT — helpers
// ─────────────────────────────────────────────────────────────

const SPORT_PILL_COLOR: Record<string, string> = {
  run:       '#22c55e',
  trail_run: '#F97316',
  bike:      '#06B6D4',
  swim:      '#0EA5E9',
  gym:       '#f97316',
  hyrox:     '#7C3AED',
  rowing:    '#EF4444',
}
const SPORT_PILL_LABEL: Record<string, string> = {
  run: 'Course', trail_run: 'Trail', bike: 'Vélo',
  swim: 'Natation', gym: 'Muscu', hyrox: 'Hyrox', rowing: 'Aviron',
}

function SportZoneDonut({ timesS, colors, size = 80 }: { timesS: number[]; colors: string[]; size?: number }) {
  const total = timesS.reduce((a, b) => a + b, 0)
  if (!total) return null
  const cx = size / 2, cy = size / 2
  const R = size * 0.42, inner = R * 0.55
  let angle = -Math.PI / 2
  const arcs: { d: string; color: string }[] = []
  timesS.forEach((t, i) => {
    if (!t) return
    const sweep = (t / total) * 2 * Math.PI
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
    const x2 = cx + R * Math.cos(angle + sweep), y2 = cy + R * Math.sin(angle + sweep)
    const xi1 = cx + inner * Math.cos(angle + sweep), yi1 = cy + inner * Math.sin(angle + sweep)
    const xi2 = cx + inner * Math.cos(angle), yi2 = cy + inner * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    arcs.push({ color: colors[i] ?? '#ccc', d: `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi1.toFixed(2)},${yi1.toFixed(2)} A${inner},${inner} 0 ${large},0 ${xi2.toFixed(2)},${yi2.toFixed(2)} Z` })
    angle += sweep
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => <path key={i} d={arc.d} fill={arc.color} />)}
    </svg>
  )
}

function ZoneTableWithHR({ zones, timesS, hrZones, hrTimesZ }: {
  zones: ParsedZone[]; timesS: number[]
  hrZones?: ParsedZone[]; hrTimesZ?: number[]
}) {
  const isMobile = useWindowWidth() < 768
  const totalS = timesS.reduce((a, b) => a + b, 0)
  const totalH = (hrTimesZ ?? []).reduce((a, b) => a + b, 0)
  const hasHr  = !!totalH && !!hrZones && !!hrTimesZ
  const cols = hasHr && !isMobile ? '1fr 1fr' : '1fr'
  const renderTable = (zns: ParsedZone[], tms: number[], total: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {zns.map((z, i) => {
        const t = tms[i] ?? 0
        const pct = total > 0 ? (t / total) * 100 : 0
        return (
          <div key={z.label} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 52px 36px', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, color: T.textSub, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: z.color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.label}</span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: z.color, borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: T.text, textAlign: 'right', fontWeight: 500, fontFamily: T.fontMono }}>{fmtDur(t)}</div>
            <div style={{ fontSize: 10, color: T.textMuted, textAlign: 'right' }}>{pct.toFixed(0)}%</div>
          </div>
        )
      })}
    </div>
  )
  if (!totalS) return <div style={{ fontSize: 12, color: T.textMuted }}>Aucune donnée de zone</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 20 }}>
      <div>
        {renderTable(zones, timesS, totalS)}
      </div>
      {hasHr && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Fréquence cardiaque</div>
          {renderTable(hrZones!, hrTimesZ!, totalH)}
        </div>
      )}
    </div>
  )
}

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
  const [activeSport, setActiveSport] = useState<string>('')
  const isMobile = useWindowWidth() < 768

  const sportsPresent = useMemo(() => {
    const s = new Set<string>(inRange.map(a => a.sport_type === 'virtual_bike' ? 'bike' : (a.sport_type as string)))
    return ['run', 'trail_run', 'bike', 'swim', 'gym', 'hyrox', 'rowing'].filter(sp => s.has(sp))
  }, [inRange])

  const sport = sportsPresent.includes(activeSport) ? activeSport : (sportsPresent[0] ?? '')

  if (!sportsPresent.length) {
    return <div style={{ color: T.textMuted, padding: 20, fontSize: 13 }}>Aucune activité dans la période</div>
  }

  const sportActs = inRange.filter(a => {
    const n = a.sport_type === 'virtual_bike' ? 'bike' : a.sport_type
    return n === sport
  })

  // ── Shared metrics ──────────────────────────────────────────
  const totalDist    = sportActs.reduce((s, a) => s + (a.distance_m ?? 0), 0)
  const totalTime    = sportActs.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const totalTss     = sportActs.reduce((s, a) => s + (a.tss ?? 0), 0)
  const hrVals       = sportActs.filter(a => a.avg_hr).map(a => Number(a.avg_hr))
  const avgHr        = hrVals.length ? Math.round(hrVals.reduce((a,b)=>a+b,0)/hrVals.length) : null
  const decouplings  = sportActs.filter(a => a.aerobic_decoupling != null).map(a => Number(a.aerobic_decoupling))
  const avgDecoupling = decouplings.length ? (decouplings.reduce((a,b)=>a+b,0)/decouplings.length).toFixed(1) : null

  // ── Run / Trail ─────────────────────────────────────────────
  const runPaces = sportActs
    .filter(a => a.avg_pace_s_km || (a.moving_time_s && a.distance_m && a.distance_m > 0))
    .map(a => a.avg_pace_s_km ?? (a.moving_time_s! / a.distance_m!) * 1000)
  const avgPace     = runPaces.length ? runPaces.reduce((a,b)=>a+b,0)/runPaces.length : null
  const runCadences = sportActs.filter(a => a.avg_cadence).map(a => Number(a.avg_cadence))
  const avgRunCad   = runCadences.length ? Math.round(runCadences.reduce((a,b)=>a+b,0)/runCadences.length) : null
  const totalElevUp = sportActs.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0)
  const totalElevDn = sportActs.reduce((s, a) => s + (a.elevation_loss_m ?? 0), 0)

  // ── Bike ────────────────────────────────────────────────────
  const bikeWatts = sportActs.filter(a => a.avg_watts).map(a => Number(a.avg_watts))
  const avgWatts  = bikeWatts.length ? Math.round(bikeWatts.reduce((a,b)=>a+b,0)/bikeWatts.length) : null
  const bikeNp    = sportActs.filter(a => a.normalized_watts).map(a => Number(a.normalized_watts))
  const avgNp     = bikeNp.length ? Math.round(bikeNp.reduce((a,b)=>a+b,0)/bikeNp.length) : null
  const bikeIfVals = sportActs.filter(a => a.intensity_factor).map(a => Number(a.intensity_factor))
  const avgIf     = bikeIfVals.length ? (bikeIfVals.reduce((a,b)=>a+b,0)/bikeIfVals.length).toFixed(2) : null
  const bikeCads  = sportActs.filter(a => a.avg_cadence).map(a => Number(a.avg_cadence))
  const avgBikeCad = bikeCads.length ? Math.round(bikeCads.reduce((a,b)=>a+b,0)/bikeCads.length) : null

  // ── Swim ────────────────────────────────────────────────────
  const swimPaces   = sportActs.filter(a => a.avg_pace_s_km).map(a => Number(a.avg_pace_s_km))
  const avgSwimPace = swimPaces.length ? Math.round(swimPaces.reduce((a,b)=>a+b,0)/swimPaces.length / 10) : null // s/100m

  // ── Rowing ──────────────────────────────────────────────────
  const rowPaces   = sportActs.filter(a => a.avg_pace_s_km).map(a => Number(a.avg_pace_s_km))
  const avgRowSplit = rowPaces.length ? Math.round(rowPaces.reduce((a,b)=>a+b,0)/rowPaces.length / 2) : null // s/500m

  // ── Gym ─────────────────────────────────────────────────────
  const calVals    = sportActs.filter(a => a.calories).map(a => Number(a.calories))
  const avgCal     = calVals.length ? Math.round(calVals.reduce((a,b)=>a+b,0)/calVals.length) : null

  // ── Zone data for current sport ──────────────────────────────
  // HR times filtered to current sport
  const hrTimesForSport = useMemo(() => {
    const acc = hrZones.map(() => 0)
    for (const a of sportActs) {
      const streams = a.streams ?? (a.raw_data?.streams as StreamData | undefined) ?? null
      if (!streams?.heartrate) continue
      const t = calcTimeInZones(streams.heartrate, hrZones)
      t.forEach((v, i) => { acc[i] += v })
    }
    return acc
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, sport])

  const hasHrForSport = hrTimesForSport.some(t => t > 0)

  const runZoneRow = zones.find(z => z.sport === 'run')
  const vapKmh = runZoneRow?.vma_ms ? (Number(runZoneRow.vma_ms) * 3.6).toFixed(1) : null

  // ── Render ───────────────────────────────────────────────────
  const pillColor = SPORT_PILL_COLOR[sport] ?? T.accent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, overflowX: 'hidden' }}>

      {/* Sport pills */}
      <div className={isMobile ? 'comp-chips-scroll' : undefined} style={{
        display: 'flex', gap: 6,
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        overflowX: isMobile ? 'auto' : 'visible',
      }}>
        {sportsPresent.map(sp => {
          const active = sp === sport
          const c = SPORT_PILL_COLOR[sp] ?? T.accent
          return (
            <button key={sp} onClick={() => setActiveSport(sp)} style={{
              padding: '5px 14px', fontSize: 13, fontWeight: 600, borderRadius: 20,
              cursor: 'pointer', border: `1px solid ${active ? c : T.border}`,
              background: active ? c : T.bgAlt,
              color: active ? '#fff' : T.textMuted,
              transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              {SPORT_PILL_LABEL[sp] ?? sp}
            </button>
          )
        })}
      </div>

      {/* ── Run ── */}
      {sport === 'run' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {avgPace != null && <StatCard label="Allure moy." value={fmtPace(avgPace)} />}
            {avgHr   != null && <StatCard label="FC moy." value={`${avgHr} bpm`} />}
            {avgRunCad != null && <StatCard label="Cadence moy." value={`${avgRunCad} spm`} />}
            {totalTss > 0 && <StatCard label="SM période" value={Math.round(totalTss).toString()} />}
            {vapKmh && <StatCard label="VAP" value={`${vapKmh} km/h`} />}
          </div>
          {runZones && runTimesZ && runTimesZ.some(t => t > 0) && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle>Zones allure + FC</SectionTitle>
                <SportZoneDonut timesS={runTimesZ} colors={ZONE_COLORS} size={64} />
              </div>
              <ZoneTableWithHR
                zones={runZones} timesS={runTimesZ}
                hrZones={hasHrForSport ? hrZones : undefined}
                hrTimesZ={hasHrForSport ? hrTimesForSport : undefined}
              />
            </div>
          )}
          {!runZones && hasHrForSport && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle>Zones FC</SectionTitle>
                <SportZoneDonut timesS={hrTimesForSport} colors={ZONE_COLORS} size={64} />
              </div>
              <ZoneBars zones={hrZones} timesS={hrTimesForSport} />
            </div>
          )}
          {avgDecoupling && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: T.textMuted }}>Découplage aérobie moyen</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: pillColor }}>{avgDecoupling}%</div>
            </div>
          )}
        </div>
      )}

      {/* ── Trail ── */}
      {sport === 'trail_run' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="Séances" value={sportActs.length.toString()} />
            <StatCard label="Distance tot." value={fmtDist(totalDist)} />
            {totalElevUp > 0 && <StatCard label="D+ total" value={`${Math.round(totalElevUp)} m`} />}
            {totalElevDn > 0 && <StatCard label="D− total" value={`${Math.round(totalElevDn)} m`} />}
            {avgPace != null && <StatCard label="Allure moy." value={fmtPace(avgPace)} />}
            {avgHr   != null && <StatCard label="FC moy." value={`${avgHr} bpm`} />}
          </div>
          {hasHrForSport && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle>Zones FC — Trail</SectionTitle>
                <SportZoneDonut timesS={hrTimesForSport} colors={ZONE_COLORS} size={64} />
              </div>
              <ZoneBars zones={hrZones} timesS={hrTimesForSport} />
            </div>
          )}
          {totalElevUp === 0 && <div style={{ fontSize: 12, color: T.textMuted, padding: '8px 0' }}>Dénivelé non disponible pour certaines activités</div>}
        </div>
      )}

      {/* ── Bike ── */}
      {sport === 'bike' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {avgWatts   != null && <StatCard label="Watts moy." value={`${avgWatts} W`} />}
            {avgNp      != null && <StatCard label="NP moy." value={`${avgNp} W`} />}
            {avgIf      != null && <StatCard label="IF moy." value={avgIf} />}
            {avgBikeCad != null && <StatCard label="Cadence moy." value={`${avgBikeCad} rpm`} />}
            {avgHr      != null && <StatCard label="FC moy." value={`${avgHr} bpm`} />}
            {avgDecoupling && <StatCard label="Découplage" value={`${avgDecoupling}%`} />}
          </div>
          {bikeZones && bikeTimesZ && bikeTimesZ.some(t => t > 0) && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle>Zones puissance + FC</SectionTitle>
                <SportZoneDonut timesS={bikeTimesZ} colors={ZONE_COLORS} size={64} />
              </div>
              <ZoneTableWithHR
                zones={bikeZones} timesS={bikeTimesZ}
                hrZones={hasHrForSport ? hrZones : undefined}
                hrTimesZ={hasHrForSport ? hrTimesForSport : undefined}
              />
            </div>
          )}
          {!bikeZones && hasHrForSport && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle>Zones FC</SectionTitle>
                <SportZoneDonut timesS={hrTimesForSport} colors={ZONE_COLORS} size={64} />
              </div>
              <ZoneBars zones={hrZones} timesS={hrTimesForSport} />
            </div>
          )}
        </div>
      )}

      {/* ── Swim ── */}
      {sport === 'swim' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="Séances" value={sportActs.length.toString()} />
            <StatCard label="Distance tot." value={fmtDist(totalDist)} />
            <StatCard label="Temps tot." value={fmtDur(totalTime)} />
            {avgSwimPace != null && <StatCard label="Allure /100m" value={fmtDur(avgSwimPace)} />}
          </div>
          {hasHrForSport && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle>Zones FC</SectionTitle>
                <SportZoneDonut timesS={hrTimesForSport} colors={ZONE_COLORS} size={64} />
              </div>
              <ZoneBars zones={hrZones} timesS={hrTimesForSport} />
            </div>
          )}
          {!hasHrForSport && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: T.textMuted }}>Zones non disponibles pour la natation</div>
            </div>
          )}
        </div>
      )}

      {/* ── Gym ── */}
      {sport === 'gym' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="Séances" value={sportActs.length.toString()} />
            <StatCard label="Temps tot." value={fmtDur(totalTime)} />
            {avgCal != null && <StatCard label="Calories moy." value={`${avgCal} kcal`} />}
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: T.textMuted }}>Analyse spécifique musculation à venir</div>
          </div>
        </div>
      )}

      {/* ── Hyrox ── */}
      {sport === 'hyrox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="Séances" value={sportActs.length.toString()} />
            {totalTime > 0 && <StatCard label="Temps moy." value={fmtDur(Math.round(totalTime / sportActs.length))} />}
            {totalDist > 0 && <StatCard label="Distance tot." value={fmtDist(totalDist)} />}
            {avgHr != null && <StatCard label="FC moy." value={`${avgHr} bpm`} />}
          </div>
          {hasHrForSport && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle>Zones FC</SectionTitle>
                <SportZoneDonut timesS={hrTimesForSport} colors={ZONE_COLORS} size={64} />
              </div>
              <ZoneBars zones={hrZones} timesS={hrTimesForSport} />
            </div>
          )}
          {!hasHrForSport && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: T.textMuted }}>Analyse détaillée Hyrox à venir</div>
            </div>
          )}
        </div>
      )}

      {/* ── Rowing ── */}
      {sport === 'rowing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="Séances" value={sportActs.length.toString()} />
            <StatCard label="Distance tot." value={fmtDist(totalDist)} />
            <StatCard label="Temps tot." value={fmtDur(totalTime)} />
            {avgRowSplit != null && <StatCard label="Split moy. /500m" value={fmtDur(avgRowSplit)} />}
            {avgHr      != null && <StatCard label="FC moy." value={`${avgHr} bpm`} />}
          </div>
          {hasHrForSport && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle>Zones FC</SectionTitle>
                <SportZoneDonut timesS={hrTimesForSport} colors={ZONE_COLORS} size={64} />
              </div>
              <ZoneBars zones={hrZones} timesS={hrTimesForSport} />
            </div>
          )}
        </div>
      )}

    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// WEEK DETAIL MODAL
// ─────────────────────────────────────────────────────────────
const WK_HR_ZONES: ParsedZone[] = [
  { label: 'Z1 Récup',   color: ZONE_COLORS[0], min: 0,   max: 120 },
  { label: 'Z2 Aérobie', color: ZONE_COLORS[1], min: 120, max: 150 },
  { label: 'Z3 Tempo',   color: ZONE_COLORS[2], min: 150, max: 165 },
  { label: 'Z4 Seuil',   color: ZONE_COLORS[3], min: 165, max: 180 },
  { label: 'Z5 VO2max',  color: ZONE_COLORS[4], min: 180, max: 999 },
]

function WeekDetailModal({ week, activities, zones, onClose }: {
  week: { week: string; total: number; time: number; dist: number; count: number; sports: Map<string, number> }
  activities: Activity[]
  zones: TrainingZoneRow[]
  onClose: () => void
}) {
  const width    = useWindowWidth()
  const isMobile = width < 768
  const [sportFilter, setSportFilter] = useState<string>('all')

  // Slide bas→haut à l'ouverture, haut→bas à la fermeture (avant démontage).
  const [open, setOpen] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setOpen(false); setTimeout(onClose, 320) }

  const weekStart = useMemo(() => { const d = new Date(week.week + 'T00:00:00'); d.setHours(0,0,0,0); return d }, [week.week])
  const weekEnd   = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); d.setHours(23,59,59,999); return d }, [weekStart])

  const weekActs = useMemo(() =>
    activities.filter(a => { const d = new Date(a.started_at); return d >= weekStart && d <= weekEnd }),
    [activities, weekStart, weekEnd]
  )

  const prevWeekActs = useMemo(() => {
    const ps = new Date(weekStart); ps.setDate(ps.getDate() - 7)
    const pe = new Date(weekEnd);   pe.setDate(pe.getDate() - 7)
    return activities.filter(a => { const d = new Date(a.started_at); return d >= ps && d <= pe })
  }, [activities, weekStart, weekEnd])

  // ── Summary stats ──────────────────────────────────────────
  const totalTime = weekActs.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const totalDist = weekActs.reduce((s, a) => s + (a.distance_m ?? 0), 0)
  const totalElev = weekActs.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0)
  const totalTss  = weekActs.reduce((s, a) => s + (a.tss ?? 0), 0)
  const hrVals    = weekActs.filter(a => a.avg_hr).map(a => Number(a.avg_hr))
  const meanHr    = hrVals.length ? Math.round(hrVals.reduce((a,b) => a+b, 0) / hrVals.length) : null
  const prevTime  = prevWeekActs.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const compPct   = prevTime > 0 ? Math.round(((totalTime - prevTime) / prevTime) * 100) : null

  // ── Sports present ─────────────────────────────────────────
  const sportsPresent = useMemo(() => {
    const s = new Set<string>()
    weekActs.forEach(a => s.add(normalizeSport(a.sport_type)))
    return ['run','trail_run','bike','swim','gym','hyrox','rowing'].filter(sp => s.has(sp))
  }, [weekActs])

  // ── Days Mon→Sun ───────────────────────────────────────────
  const daysOfWeek = useMemo(() => {
    const SHORT = ['L','M','M','J','V','S','D']
    const LONG  = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i)
      const iso = localYMD(d)
      const dayActs = weekActs.filter(a => localYMD(new Date(a.started_at)) === iso)
      const dayTime = dayActs.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
      const stMap = new Map<string, number>()
      dayActs.forEach(a => { const sp = normalizeSport(a.sport_type); stMap.set(sp, (stMap.get(sp) ?? 0) + (a.moving_time_s ?? 0)) })
      const bySport = [...stMap.entries()].sort((a,b) => b[1]-a[1])
      const dominantSport = bySport.length > 0 ? bySport[0][0] : null
      return { short: SHORT[i], long: LONG[i], iso, time: dayTime, sport: dominantSport, bySport }
    })
  }, [weekActs, weekStart])

  const maxDayTime = Math.max(...daysOfWeek.map(d => d.time), 1)

  // ── TSS by sport ───────────────────────────────────────────
  const tssBySport = useMemo(() => {
    const m = new Map<string, number>()
    weekActs.forEach(a => { const sp = normalizeSport(a.sport_type); m.set(sp, (m.get(sp) ?? 0) + (a.tss ?? 0)) })
    return m
  }, [weekActs])

  const totalTssSports = Array.from(tssBySport.values()).reduce((a,b) => a+b, 0)

  // ── Zone rows ──────────────────────────────────────────────
  const bikeZoneRow = zones.find(z => z.sport === 'bike')
  const bikeZones   = bikeZoneRow ? buildZones(bikeZoneRow) : null

  // ── Filtered acts for HR ───────────────────────────────────
  // FC : seulement course à pied et vélo (sports à FC pertinente — cf. HR_SPORTS).
  const filteredActs = useMemo(() =>
    sportFilter === 'all'
      ? weekActs.filter(a => HR_SPORTS.includes(normalizeSport(a.sport_type)))
      : weekActs.filter(a => normalizeSport(a.sport_type) === sportFilter),
    [weekActs, sportFilter]
  )

  // ── HR times by zone ───────────────────────────────────────
  const hrTimesZ = useMemo(() => {
    const acc = WK_HR_ZONES.map(() => 0)
    for (const a of filteredActs) {
      const streams = a.streams ?? (a.raw_data?.streams as StreamData | null)
      if (!streams?.heartrate?.length) continue
      const t = calcTimeInZones(streams.heartrate, WK_HR_ZONES)
      t.forEach((v, i) => { acc[i] += v })
    }
    return acc
  }, [filteredActs])

  // ── Bike power times ───────────────────────────────────────
  const bikeTimesZ = useMemo(() => {
    if (!bikeZones) return null
    const acc = bikeZones.map(() => 0)
    for (const a of weekActs) {
      if (!['bike','virtual_bike'].includes(a.sport_type)) continue
      const streams = a.streams ?? (a.raw_data?.streams as StreamData | null)
      if (!streams?.watts?.length) continue
      const t = calcTimeInZones(streams.watts, bikeZones)
      t.forEach((v, i) => { acc[i] += v })
    }
    return acc
  }, [weekActs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polarization bands ─────────────────────────────────────
  const hrTotal = hrTimesZ.reduce((a,b) => a+b, 0)
  const hrBands = hrTotal > 0 ? [
    { label: 'Endurance',  sub: 'Z1–Z2', time: hrTimesZ[0] + hrTimesZ[1], color: '#10B981' },
    { label: 'Tempo',      sub: 'Z3',    time: hrTimesZ[2],                color: '#F97316' },
    { label: 'Haute int.', sub: 'Z4–Z5', time: hrTimesZ[3] + hrTimesZ[4], color: '#EF4444' },
  ] : null

  const bikeTotal = bikeTimesZ ? bikeTimesZ.reduce((a,b) => a+b, 0) : 0
  const bikeBands = bikeTimesZ && bikeTotal > 0 && bikeZones ? [
    { label: 'Endurance',      sub: 'Z1–Z2', time: bikeTimesZ[0] + bikeTimesZ[1], color: '#10B981' },
    { label: 'Tempo/Seuil',    sub: 'Z3',    time: bikeTimesZ[2],                 color: '#F97316' },
    { label: 'VO2/Anaérobie',  sub: 'Z4–Z5', time: bikeTimesZ[3] + bikeTimesZ[4], color: '#EF4444' },
  ] : null

  const dateLabel = weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) +
    ' – ' + weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

  const sortedActs = useMemo(() =>
    [...weekActs].sort((a,b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()),
    [weekActs]
  )

  // ── Section header style ───────────────────────────────────
  const secTitle = (label: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase',
      letterSpacing: 0.8, marginBottom: 10, fontFamily: T.fontDisplay }}>{label}</div>
  )

  // ── Sport selector ─────────────────────────────────────────
  const sportSelectorEl = (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
      {(['all', ...sportsPresent.filter(sp => HR_SPORTS.includes(sp))] as string[]).map(sp => {
        const active = sportFilter === sp
        return (
          <button key={sp} onClick={() => setSportFilter(sp)} style={{
            padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: active ? 'none' : `1px solid ${T.border}`,
            background: active ? 'linear-gradient(135deg,#06B6D4,#3B82F6)' : T.bgAlt,
            color: active ? '#fff' : T.textMuted,
          }}>
            {sp === 'all' ? 'Tous' : (SPORT_LABEL[sp as SportType] ?? sp)}
          </button>
        )
      })}
    </div>
  )

  // ── Polarization band renderer ─────────────────────────────
  function renderBands(bands: { label: string; sub: string; time: number; color: string }[], total: number) {
    return bands.map(band => {
      const pct = total > 0 ? (band.time / total) * 100 : 0
      return (
        <div key={band.label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
              <span style={{ fontSize: 9, color: band.color, fontWeight: 700, marginRight: 5,
                background: band.color + '22', borderRadius: 3, padding: '1px 4px' }}>{band.sub}</span>
              {band.label}
            </div>
            <div style={{ fontSize: 11, color: T.textSub, display: 'flex', gap: 6 }}>
              <span className="stat-number" style={{ fontWeight: 700, color: T.text }}>{fmtDur(band.time)}</span>
              <span style={{ color: T.textMuted }}>{pct.toFixed(0)}%</span>
            </div>
          </div>
          <div style={{ height: 5, background: T.bgAlt, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: band.color, borderRadius: 3 }} />
          </div>
        </div>
      )
    })
  }

  // ── Répartition semaine ────────────────────────────────────
  const distributionEl = (
    <div style={{ background: T.surface, borderRadius: T.radiusSm, padding: '14px 16px', border: `1px solid ${T.border}` }}>
      {secTitle('Répartition sur la semaine')}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
        {daysOfWeek.map((day, i) => {
          const barH = day.time > 0 ? Math.max(5, (day.time / maxDayTime) * 60) : 2
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', paddingBottom: 0 }}>
                {/* Barre empilée : un segment coloré par sport pratiqué ce jour-là. */}
                <div style={{
                  width: '100%', height: barH, borderRadius: 3, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  background: day.time === 0 ? T.bgAlt : 'transparent',
                  border: day.time === 0 ? `1px solid ${T.border}` : 'none',
                }}>
                  {day.time > 0 && day.bySport.map(([sp, t]) => (
                    <div key={sp} style={{ width: '100%', height: `${(t / day.time) * 100}%`, background: SPORT_COLOR[sp as SportType] ?? '#888' }} />
                  ))}
                </div>
              </div>
              <span style={{ fontSize: isMobile ? 9 : 10, color: T.textMuted, fontWeight: 600 }}>
                {isMobile ? day.short : day.long}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── TSS total ──────────────────────────────────────────────
  const tssEl = (
    <div style={{ background: T.surface, borderRadius: T.radiusSm, padding: '14px 16px', border: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase',
          letterSpacing: 0.8, fontFamily: T.fontDisplay }}>SM total</span>
        <span className="stat-number" style={{ fontSize: 18, fontWeight: 700, color: T.text }}>
          {totalTss > 0 ? Math.round(totalTss) : '—'}
        </span>
      </div>
      {totalTssSports > 0 ? (
        <>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 10 }}>
            {[...tssBySport.entries()].filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([sp, tss]) => (
              <div key={sp} style={{ flex: tss / totalTssSports, background: SPORT_COLOR[sp as SportType] ?? '#888', minWidth: 2 }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            {[...tssBySport.entries()].filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([sp, tss]) => (
              <div key={sp} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.textSub }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: SPORT_COLOR[sp as SportType] ?? '#888', display: 'inline-block' }} />
                {SPORT_LABEL[sp as SportType] ?? sp}
                <span className="stat-number" style={{ fontWeight: 700, color: T.text, fontSize: 12 }}>{Math.round(tss)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: T.textMuted }}>—</div>
      )}
    </div>
  )

  // ── HR polarisation ────────────────────────────────────────
  const hrPolEl = (
    <div style={{ background: T.surface, borderRadius: T.radiusSm, padding: '14px 16px', border: `1px solid ${T.border}` }}>
      {secTitle('Polarisation FC')}
      {sportSelectorEl}
      {hrBands ? renderBands(hrBands, hrTotal) : (
        <div style={{ fontSize: 12, color: T.textMuted }}>Aucune donnée FC pour cette sélection</div>
      )}
    </div>
  )

  // ── Bike power polarisation ────────────────────────────────
  const bikePowerEl = (
    <div style={{ background: T.surface, borderRadius: T.radiusSm, padding: '14px 16px',
      border: `1px solid ${T.border}`, borderTop: '3px solid #06B6D4' }}>
      {secTitle('Polarisation puissance — Cyclisme')}
      {bikeBands ? renderBands(bikeBands, bikeTotal) : (
        <div style={{ fontSize: 12, color: T.textMuted }}>—</div>
      )}
    </div>
  )

  // ── Zones FC détaillées ────────────────────────────────────
  const hrZonesEl = (
    <div style={{ background: T.surface, borderRadius: T.radiusSm, padding: '14px 16px', border: `1px solid ${T.border}` }}>
      {secTitle('Zones FC détaillées')}
      {sportSelectorEl}
      {hrTotal > 0 ? WK_HR_ZONES.map((zone, i) => {
        const t   = hrTimesZ[i]
        const pct = hrTotal > 0 ? (t / hrTotal) * 100 : 0
        return (
          <div key={zone.label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: zone.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: T.text, fontWeight: 600 }}>{zone.label}</span>
            </div>
            <div style={{ height: 5, background: T.bgAlt, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: zone.color, borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', gap: 5, fontSize: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
              <span className="stat-number" style={{ fontWeight: 700, color: T.text, fontSize: 11 }}>{fmtDur(t)}</span>
              <span style={{ color: T.textMuted }}>{pct.toFixed(0)}%</span>
            </div>
          </div>
        )
      }) : (
        <div style={{ fontSize: 12, color: T.textMuted }}>Aucune donnée FC</div>
      )}
    </div>
  )

  // ── Activités ──────────────────────────────────────────────
  const activitiesEl = (
    <div style={{ background: T.surface, borderRadius: T.radiusSm, padding: '14px 16px', border: `1px solid ${T.border}` }}>
      {secTitle('Activités')}
      {sortedActs.length === 0 ? (
        <div style={{ fontSize: 12, color: T.textMuted }}>Aucune activité</div>
      ) : sortedActs.map(act => {
        const col  = SPORT_COLOR[act.sport_type] ?? '#888'
        const stat = ['gym','hyrox'].includes(act.sport_type)
          ? fmtDur(act.moving_time_s)
          : (act.distance_m ? fmtDist(act.distance_m) : fmtDur(act.moving_time_s))
        return (
          <div key={act.id}
            onClick={() => { window.location.href = `/activities?id=${act.id}` }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px',
              cursor: 'pointer', borderRadius: 8, marginBottom: 1 }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = T.bgAlt }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            <span style={{ width: 3, height: 36, background: col, borderRadius: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {act.title}
              </div>
              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>
                {new Date(act.started_at).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
              </div>
            </div>
            <span className="stat-number" style={{ fontSize: 13, fontWeight: 700, color: T.text, flexShrink: 0 }}>{stat}</span>
            <ChevronRight size={14} color={T.textMuted} />
          </div>
        )
      })}
    </div>
  )

  // ── Header ─────────────────────────────────────────────────
  const headerEl = (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay }}>
            Semaine du {dateLabel}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>{week.count} séance{week.count !== 1 ? 's' : ''}</span>
            {sportsPresent.map(sp => {
              const cnt = weekActs.filter(a => normalizeSport(a.sport_type) === sp).length
              return (
                <span key={sp} style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: T.bgAlt, borderRadius: 10, padding: '2px 8px', fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: SPORT_COLOR[sp as SportType] ?? '#888', flexShrink: 0 }} />
                  <span style={{ color: T.text, fontWeight: 600 }}>{SPORT_LABEL[sp as SportType] ?? sp}</span>
                  <span style={{ color: T.textMuted }}>{cnt}</span>
                </span>
              )
            })}
          </div>
          {compPct !== null && (
            <div style={{ fontSize: 12, marginTop: 5, fontWeight: 600,
              color: compPct >= 0 ? '#10B981' : '#F97316' }}>
              {compPct >= 0 ? '↑ +' : '↓ '}{compPct}% vs semaine préc.
            </div>
          )}
        </div>
        <button onClick={requestClose} aria-label="Fermer" style={{ background: T.bgAlt, border: 'none', cursor: 'pointer',
          color: T.textMuted, fontSize: 18, lineHeight: 1, flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
    </div>
  )

  // ── Stats grid ─────────────────────────────────────────────
  const statsEl = (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(6,1fr)', gap: 8, marginBottom: 16 }}>
      {[
        { label: 'Temps',    value: fmtDur(totalTime) },
        { label: 'Distance', value: fmtDist(totalDist) },
        { label: 'D+',       value: totalElev >= 1 ? `+${Math.round(totalElev)} m` : '—' },
        { label: 'SM',       value: totalTss > 0 ? Math.round(totalTss).toString() : '—' },
        { label: 'FC moy.',  value: meanHr ? `${meanHr} bpm` : '—' },
        { label: 'Séances',  value: week.count.toString() },
      ].map(k => (
        <div key={k.label} style={{ background: T.bgAlt, borderRadius: T.radiusSm, padding: '9px 12px' }}>
          <div style={{ fontSize: 9, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.7,
            fontWeight: 700, fontFamily: T.fontDisplay, marginBottom: 3 }}>{k.label}</div>
          <div className="stat-number" style={{ fontSize: 15, color: T.text }}>{k.value}</div>
        </div>
      ))}
    </div>
  )

  // ── Body ───────────────────────────────────────────────────
  const bodyEl = (
    <>
      {statsEl}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {distributionEl}
        {tssEl}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {hrPolEl}
        {bikePowerEl}
      </div>
      <div style={{ marginBottom: 12 }}>{hrZonesEl}</div>
      {activitiesEl}
    </>
  )

  // ── Mobile → BottomSheet (slide géré par isOpen) ───────────
  if (isMobile) {
    return (
      <BottomSheet isOpen={open} onClose={requestClose}>
        {headerEl}
        {bodyEl}
      </BottomSheet>
    )
  }

  // ── Desktop → sur-page coulissante bas→haut ────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: `rgba(0,0,0,${open ? 0.5 : 0})`, zIndex: 600,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      transition: 'background .32s ease', backdropFilter: open ? 'blur(3px)' : 'none' }}
      onClick={requestClose}>
      <div style={{ background: T.surface, borderRadius: '22px 22px 0 0', width: '100%', maxWidth: '100%',
        maxHeight: '93vh', overflowY: 'auto', boxShadow: '0 -10px 50px rgba(0,0,0,0.30)', padding: '12px 28px 28px',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .34s cubic-bezier(.2,.8,.2,1)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '0 auto 16px' }} />
        {headerEl}
        {bodyEl}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PMC HELPER — daily CTL/ATL/TSB series
// ─────────────────────────────────────────────────────────────
function computePMCSeries(
  acts: { started_at: string; tss: number | null }[],
  displayDays: number
): Array<{ date: string; ctl: number; atl: number; tsb: number; tss: number }> {
  const tssMap = new Map<string, number>()
  for (const a of acts) {
    if (!a.tss) continue
    const d = a.started_at.slice(0, 10)
    tssMap.set(d, (tssMap.get(d) ?? 0) + Number(a.tss))
  }
  const today = new Date()
  const result: Array<{ date: string; ctl: number; atl: number; tsb: number; tss: number }> = []
  let ctl = 0, atl = 0
  const ctlK = 1 / 42, atlK = 1 / 7
  const WARMUP = 90
  for (let i = displayDays + WARMUP; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const tss = tssMap.get(dateStr) ?? 0
    const prevCtl = ctl, prevAtl = atl
    ctl += (tss - ctl) * ctlK
    atl += (tss - atl) * atlK
    if (i <= displayDays) {
      result.push({
        date: dateStr,
        ctl:  Math.round(ctl * 10) / 10,
        atl:  Math.round(atl * 10) / 10,
        tsb:  Math.round((prevCtl - prevAtl) * 10) / 10,
        tss:  Math.round(tss),
      })
    }
  }
  return result
}

function SectionDonnees({ activities, zones, profile }: {
  activities: Activity[]
  zones: TrainingZoneRow[]
  profile: Profile
}) {
  const [filter, setFilter] = useState<TimeFilter>('4w')
  const [dataTab, setDataTab] = useState<'general' | 'specific'>('general')
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false)
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

  // Requête dédiée graphe — indépendante de la pagination, 52 semaines pour navigation
  const [weeklyActs, setWeeklyActs] = useState<{ started_at: string; moving_time_s: number | null; distance_m: number | null; sport_type: string }[]>([])
  useEffect(() => {
    const start = new Date(); start.setDate(start.getDate() - 52 * 7)
    createClient()
      .from('activities')
      .select('started_at, moving_time_s, distance_m, sport_type')
      .gte('started_at', start.toISOString())
      .order('started_at', { ascending: true })
      .then(({ data }) => setWeeklyActs((data ?? []) as { started_at: string; moving_time_s: number | null; distance_m: number | null; sport_type: string }[]))
  }, [])

  // ── PMC data ───────────────────────────────────────────────────────────────
  const [pmcActs, setPmcActs] = useState<{ started_at: string; tss: number | null; title: string | null }[]>([])
  const [pmcHoverIdx, setPmcHoverIdx] = useState<number | null>(null)
  const pmcSvgRef = useRef<SVGSVGElement>(null)
  const [heatHover, setHeatHover] = useState<{ date: string; tss: number; title: string } | null>(null)
  const width = useWindowWidth()
  const isMobile = width < 768

  useEffect(() => {
    const start = new Date(); start.setDate(start.getDate() - 400)
    createClient().from('activities').select('started_at, tss, title')
      .gte('started_at', start.toISOString())
      .order('started_at', { ascending: true })
      .then(({ data }) => setPmcActs((data ?? []) as { started_at: string; tss: number | null; title: string | null }[]))
  }, [])

  const displayDays = numWeeks(filter) * 7
  const pmcSeries = useMemo(() => computePMCSeries(pmcActs, displayDays), [pmcActs, displayDays])

  // PMC tactile : listener natif {passive:false} (la ligne verticale + tooltip
  // suivent le doigt sans scroller la page). Re-bind quand le SVG apparaît.
  useEffect(() => {
    const svg = pmcSvgRef.current
    const len = pmcSeries.length
    if (!svg || len < 2) return
    const move = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      const rect = svg.getBoundingClientRect()
      const pct = (t.clientX - rect.left) / rect.width
      const idx = Math.round(pct * (len - 1))
      setPmcHoverIdx(Math.max(0, Math.min(len - 1, idx)))
      e.preventDefault()
    }
    const end = () => setPmcHoverIdx(null)
    svg.addEventListener('touchstart', move, { passive: false })
    svg.addEventListener('touchmove', move, { passive: false })
    svg.addEventListener('touchend', end)
    return () => {
      svg.removeEventListener('touchstart', move)
      svg.removeEventListener('touchmove', move)
      svg.removeEventListener('touchend', end)
    }
  }, [pmcSeries.length])

  const prevCutoff = useMemo(() => {
    if (!cutoff) return null
    const now = new Date()
    const ms = now.getTime() - cutoff.getTime()
    return new Date(cutoff.getTime() - ms)
  }, [cutoff]) // eslint-disable-line react-hooks/exhaustive-deps

  const prevInRange = useMemo(() =>
    prevCutoff && cutoff
      ? activities.filter(a => { const d = new Date(a.started_at); return d >= prevCutoff && d < cutoff })
      : [],
    [activities, prevCutoff, cutoff] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const tssByDate = useMemo(() => {
    const map = new Map<string, { tss: number; title: string }>()
    for (const a of pmcActs) {
      if (!a.tss) continue
      const d = a.started_at.slice(0, 10)
      const e = map.get(d)
      map.set(d, { tss: (e?.tss ?? 0) + Number(a.tss), title: a.title ?? '' })
    }
    return map
  }, [pmcActs])

  const CHART_WEEKS = 52
  const [weekBlockOffset, setWeekBlockOffset] = useState(0)
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

  // ── TSB form color ─────────────────────────────────────────────────────────
  const tsbColor = tsb < -20 ? '#EF4444' : tsb < -10 ? '#F97316' : tsb < 5 ? '#06B6D4' : tsb < 20 ? '#10B981' : '#818CF8'
  const tsbLabel = tsb < -20 ? 'Très fatigué' : tsb < -10 ? 'Fatigué' : tsb < 5 ? 'Optimal' : tsb < 20 ? 'Frais' : 'Très frais'
  const tsbAdvice = tsb < -20 ? 'Récupération obligatoire' : tsb < -10 ? 'Récupération recommandée' : tsb < 5 ? 'Prêt à performer' : tsb < 20 ? 'Forme optimale' : 'Risque de désentraînement'

  // ── Trend helper ────────────────────────────────────────────────────────────
  function trendOf(curr: number, prev: number): { pct: number; color: string; arrow: string } {
    if (!prev || !curr) return { pct: 0, color: 'var(--text-dim)', arrow: '→' }
    const pct = ((curr - prev) / prev) * 100
    if (Math.abs(pct) < 3) return { pct: 0, color: 'var(--text-dim)', arrow: '→' }
    if (pct > 0) return { pct, color: pct > 25 ? '#EF4444' : '#10B981', arrow: '↑' }
    return { pct, color: '#F97316', arrow: '↓' }
  }

  // ── PMC chart dims ──────────────────────────────────────────────────────────
  const PMC_W = 900, PMC_H = 160, PMC_PL = 40, PMC_PR = 12, PMC_PT = 12, PMC_PB = 24
  const pmcChW = PMC_W - PMC_PL - PMC_PR
  const pmcChH = PMC_H - PMC_PT - PMC_PB
  const pmcCtls = pmcSeries.map(p => p.ctl)
  const pmcAtls = pmcSeries.map(p => p.atl)
  const pmcTsbs = pmcSeries.map(p => p.tsb)
  const pmcYMax = Math.max(...pmcCtls, ...pmcAtls, 10) * 1.08
  const pmcYMin = Math.min(...pmcTsbs, 0) - 5
  const pmcYRange = pmcYMax - pmcYMin
  const pmcYOf = (v: number) => PMC_PT + pmcChH - ((v - pmcYMin) / pmcYRange) * pmcChH
  const pmcXOf = (i: number) => PMC_PL + (i / Math.max(pmcSeries.length - 1, 1)) * pmcChW
  const pmcPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${pmcXOf(i).toFixed(1)},${pmcYOf(v).toFixed(1)}`).join(' ')

  // ── Polarization ───────────────────────────────────────────────────────────
  const polZ12 = (hrTimesZ[0] ?? 0) + (hrTimesZ[1] ?? 0)
  const polZ3  = hrTimesZ[2] ?? 0
  const polZ45 = (hrTimesZ[3] ?? 0) + (hrTimesZ[4] ?? 0)
  const polTotal = polZ12 + polZ3 + polZ45

  // ── TSB arc ────────────────────────────────────────────────────────────────
  const arcR = 48, arcCx = 60, arcCy = 60
  const arcCirc = 2 * Math.PI * arcR
  const arcTotal = arcCirc * 270 / 360  // 270° arc
  const tsbPct = Math.max(0, Math.min(1, (tsb + 30) / 60))
  const arcFilled = tsbPct * arcTotal

  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* ── SECTION 0: Button bar ── */}
      {isMobile ? (
        /* ── Contrôles compacts mobile ── */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', marginBottom: 14 }}>
          {/* GAUCHE: dropdown période */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setPeriodMenuOpen(v => !v)} style={{
              padding: '6px 12px', borderRadius: 16, border: '1px solid var(--border)',
              background: 'var(--bg)', fontSize: 13, fontWeight: 500, color: 'var(--text)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {TIME_FILTER_LABEL[filter]}
              <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
            </button>
            {periodMenuOpen && (
              <>
                <div onClick={() => setPeriodMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden', minWidth: 130,
                }}>
                {(Object.keys(TIME_FILTER_LABEL) as TimeFilter[]).map(f => (
                  <button key={f} onClick={() => { setFilter(f); setPeriodMenuOpen(false) }} style={{
                    width: '100%', padding: '10px 14px', textAlign: 'left',
                    fontSize: 13, fontWeight: filter === f ? 700 : 500,
                    background: filter === f ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : 'transparent',
                    color: filter === f ? '#fff' : 'var(--text)',
                    border: 'none', cursor: 'pointer', display: 'block',
                  }}>
                    {TIME_FILTER_LABEL[f]}
                  </button>
                ))}
              </div>
              </>
            )}
          </div>
          {/* DROITE: mini toggle Général/Spécifique */}
          <div style={{ display: 'flex', background: 'var(--bg-card2)', borderRadius: 16, padding: 2, gap: 0 }}>
            {(['general', 'specific'] as const).map(tab => (
              <button key={tab} onClick={() => setDataTab(tab)} style={{
                padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 14, border: 'none',
                cursor: 'pointer', transition: 'all 0.15s',
                background: dataTab === tab ? 'var(--bg-card)' : 'transparent',
                color: dataTab === tab ? '#06B6D4' : 'var(--text-dim)',
                boxShadow: dataTab === tab ? '0 1px 2px rgba(0,0,0,0.10)' : 'none',
              }}>
                {tab === 'general' ? 'Général' : 'Spécifique'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ── Contrôles desktop (pills) ── */
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Time filter pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {(Object.keys(TIME_FILTER_LABEL) as TimeFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : 'var(--bg)',
                color: filter === f ? '#fff' : 'var(--text-dim)',
                border: `1px solid ${filter === f ? 'transparent' : 'var(--border)'}`,
                borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
                fontWeight: filter === f ? 600 : 400, transition: 'all 0.15s',
              }}>
                {TIME_FILTER_LABEL[f]}
              </button>
            ))}
          </div>
          {/* Divider */}
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 6px', flexShrink: 0 }} />
          {/* Tab pills */}
          <div style={{ display: 'flex', gap: 5 }}>
            {(['general', 'specific'] as const).map(tab => (
              <button key={tab} onClick={() => setDataTab(tab)} style={{
                background: dataTab === tab ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : 'var(--bg)',
                color: dataTab === tab ? '#fff' : 'var(--text-dim)',
                border: `1px solid ${dataTab === tab ? 'transparent' : 'var(--border)'}`,
                borderRadius: 20, padding: '4px 14px', fontSize: 12, cursor: 'pointer',
                fontWeight: dataTab === tab ? 600 : 400, transition: 'all 0.15s',
              }}>
                {tab === 'general' ? 'Général' : 'Spécifique'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Détail semaine */}
      {selectedWeek && (
        <WeekDetailModal
          week={selectedWeek}
          activities={activities}
          zones={zones}
          onClose={() => setSelectedWeek(null)}
        />
      )}

      {/* === DONNÉES GÉNÉRALES === */}
      {dataTab === 'general' && (
        <>

          {/* ── Récap mensuel (3 premiers jours du mois) ── */}
          <MonthlySummary activities={activities} />

          {/* ── Objectifs hebdomadaires + série ── */}
          <WeeklyGoals activities={activities} />

          {/* ── SECTION 1: Hero ─────────────────────────────────────────────── */}
          {dbMetrics.loading
            ? <SkeletonFitnessCards />
            : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 16 }}>
              {/* LEFT: Forme du jour (TSB arc) */}
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius,
                padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 20,
              }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
                  {/* Background arc (270°, gray) */}
                  <circle
                    cx={arcCx} cy={arcCy} r={arcR}
                    fill="none" stroke="var(--border)" strokeWidth="9"
                    strokeDasharray={`${arcTotal.toFixed(1)} ${(arcCirc - arcTotal).toFixed(1)}`}
                    strokeLinecap="round"
                    transform={`rotate(-225 ${arcCx} ${arcCy})`}
                  />
                  {/* Value arc (colored) */}
                  <circle
                    cx={arcCx} cy={arcCy} r={arcR}
                    fill="none" stroke={tsbColor} strokeWidth="9"
                    strokeDasharray={`${arcFilled.toFixed(1)} ${(arcCirc - arcFilled).toFixed(1)}`}
                    strokeLinecap="round"
                    transform={`rotate(-225 ${arcCx} ${arcCy})`}
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                  {/* Center text */}
                  <text x={arcCx} y={arcCy - 6} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text)" fontFamily="'Barlow Condensed', sans-serif">{tsb > 0 ? '+' : ''}{Math.round(tsb)}</text>
                  <text x={arcCx} y={arcCy + 12} textAnchor="middle" fontSize="10" fill="var(--text-dim)" fontWeight="600" letterSpacing="0.06em">TSB</text>
                </svg>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: tsbColor, marginBottom: 4 }}>{tsbLabel}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{tsbAdvice}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                    CTL {Math.round(ctl)} · ATL {Math.round(atl)}
                  </div>
                  {tsb < 5 && tsb > -30 && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                      Forme optimale dans ~{Math.max(1, Math.round((5 - tsb) / Math.max(0.1, (ctl - atl) * 0.1 + 0.5)))} jours
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: CTL / ATL / TSB cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { key: 'CTL', val: Math.round(ctl), color: '#06B6D4', max: 120, sub: 'Charge chronique', note: '42 jours' },
                  { key: 'ATL', val: Math.round(atl), color: '#F97316', max: 150, sub: 'Charge aiguë',     note: '7 jours' },
                  { key: 'TSB', val: Math.round(tsb), color: tsbColor,  max: 40,  sub: 'Forme du moment', note: 'CTL−ATL' },
                ].map(({ key, val, color, max, sub, note }) => {
                  const barPct = Math.min(100, Math.abs(val) / max * 100)
                  return (
                    <div key={key} style={{
                      background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius,
                      padding: '14px 14px 12px', borderTop: `3px solid ${color}`,
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color, marginBottom: 6 }}>{key}</div>
                      <div className="stat-number" style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>
                        {val > 0 && key === 'TSB' ? '+' : ''}{val}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8 }}>{sub}</div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)' }}>{note}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── SECTION 2: PMC ──────────────────────────────────────────────── */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <SectionTitle>Performance Management Chart</SectionTitle>
              <div style={{ display: 'flex', gap: 14 }}>
                {[['CTL','#06B6D4'],['ATL','#F97316'],['TSB','#EF4444']].map(([label, col]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-dim)' }}>
                    <div style={{ width: 18, height: 2, background: col, borderRadius: 1, opacity: label === 'TSB' ? 0.7 : 1 }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            {pmcSeries.length > 1 ? (
              <div style={{ position: 'relative' }}>
                <svg
                  ref={pmcSvgRef}
                  viewBox={`0 0 ${PMC_W} ${PMC_H}`}
                  style={{ width: '100%', height: 160, display: 'block', overflow: 'visible' }}
                  preserveAspectRatio="none"
                  onMouseMove={e => {
                    const rect = pmcSvgRef.current?.getBoundingClientRect()
                    if (!rect) return
                    const pct = (e.clientX - rect.left) / rect.width
                    const idx = Math.round(pct * (pmcSeries.length - 1))
                    setPmcHoverIdx(Math.max(0, Math.min(pmcSeries.length - 1, idx)))
                  }}
                  onMouseLeave={() => setPmcHoverIdx(null)}
                >
                  {/* Y gridlines */}
                  {[0, 25, 50, 75, 100].map(v => {
                    if (v < pmcYMin || v > pmcYMax) return null
                    const y = pmcYOf(v)
                    return (
                      <g key={v}>
                        <line x1={PMC_PL} y1={y} x2={PMC_W - PMC_PR} y2={y} stroke="var(--border)" strokeWidth="0.8" strokeDasharray="4,4" />
                        <text x={PMC_PL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-dim)">{v}</text>
                      </g>
                    )
                  })}
                  {/* Zero line */}
                  <line x1={PMC_PL} y1={pmcYOf(0)} x2={PMC_W - PMC_PR} y2={pmcYOf(0)} stroke="var(--border)" strokeWidth="1" />

                  {/* CTL fill area */}
                  <path
                    d={`M${PMC_PL},${pmcYOf(0)} ${pmcCtls.map((v,i) => `L${pmcXOf(i).toFixed(1)},${pmcYOf(v).toFixed(1)}`).join(' ')} L${pmcXOf(pmcCtls.length-1).toFixed(1)},${pmcYOf(0)} Z`}
                    fill="rgba(6,182,212,0.06)"
                  />

                  {/* TSB curve (dashed, behind others) */}
                  <path d={pmcPath(pmcTsbs)} fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="5,3" strokeLinejoin="round" opacity="0.8" />

                  {/* ATL curve */}
                  <path d={pmcPath(pmcAtls)} fill="none" stroke="#F97316" strokeWidth="2" strokeLinejoin="round" />

                  {/* CTL curve */}
                  <path d={pmcPath(pmcCtls)} fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeLinejoin="round" />

                  {/* X axis labels */}
                  {pmcSeries.filter((_, i) => {
                    const step = Math.max(1, Math.floor(pmcSeries.length / 6))
                    return i === 0 || i % step === 0 || i === pmcSeries.length - 1
                  }).map((pt, _, arr) => {
                    const origIdx = pmcSeries.indexOf(pt)
                    const x = pmcXOf(origIdx)
                    const d = new Date(pt.date)
                    return (
                      <text key={pt.date} x={x} y={PMC_H - 4} textAnchor="middle" fontSize="9" fill="var(--text-dim)">
                        {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </text>
                    )
                  })}

                  {/* Hover line + dots + tooltip */}
                  {pmcHoverIdx !== null && pmcSeries[pmcHoverIdx] && (() => {
                    const pt = pmcSeries[pmcHoverIdx]
                    const x = pmcXOf(pmcHoverIdx)
                    return (
                      <>
                        <line x1={x} y1={PMC_PT} x2={x} y2={PMC_H - PMC_PB} stroke="var(--text)" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
                        <circle cx={x} cy={pmcYOf(pt.ctl)} r="4" fill="#06B6D4" />
                        <circle cx={x} cy={pmcYOf(pt.atl)} r="3.5" fill="#F97316" />
                        <circle cx={x} cy={pmcYOf(pt.tsb)} r="3" fill="#EF4444" />
                        {/* Tooltip box — agrandi pour lisibilité (TSS + CTL/ATL/TSB) */}
                        {(() => {
                          const TW = 168, TH = 132
                          const tipX = pmcHoverIdx > pmcSeries.length * 0.6 ? x - (TW + 12) : x + 12
                          const tipY = PMC_PT
                          return (
                            <g>
                              <rect x={tipX} y={tipY} width={TW} height={TH} rx="10"
                                fill="var(--bg)" stroke="var(--border)" strokeWidth="1.5" />
                              <text x={tipX + 12} y={tipY + 22} fontSize="13" fontWeight="700" fill="var(--text)">
                                {new Date(pt.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              </text>
                              <text x={tipX + 12} y={tipY + 46} fontSize="13" fill="var(--text-dim)" fontWeight="600">SM séance <tspan fill="var(--text)" fontWeight="700">{pt.tss}</tspan></text>
                              <text x={tipX + 12} y={tipY + 72} fontSize="15" fill="#06B6D4" fontWeight="700">CTL {pt.ctl}</text>
                              <text x={tipX + 12} y={tipY + 96} fontSize="15" fill="#F97316" fontWeight="700">ATL {pt.atl}</text>
                              <text x={tipX + 12} y={tipY + 120} fontSize="15" fill="#EF4444" fontWeight="700">TSB {pt.tsb > 0 ? '+' : ''}{pt.tsb}</text>
                            </g>
                          )
                        })()}
                      </>
                    )
                  })()}
                </svg>
              </div>
            ) : (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                Données insuffisantes pour le graphique
              </div>
            )}
          </div>

          {/* ── SECTION 3: 4 stats avec tendances ───────────────────────────── */}
          {(() => {
            const prevTss   = prevInRange.reduce((s, a) => s + (a.tss ?? 0), 0)
            const prevRpeVals = prevInRange.filter(a => a.rpe ?? a.perceived_effort).map(a => Number(a.rpe ?? a.perceived_effort))
            const prevMeanRpe = prevRpeVals.length ? avg(prevRpeVals) : 0
            const prevDist  = prevInRange.reduce((s, a) => s + (a.distance_m ?? 0), 0)
            const stats = [
              { label: 'Séances',    curr: inRange.length,    prev: prevInRange.length, fmt: (v: number) => v.toString() },
              { label: 'Distance',   curr: totalDist / 1000,  prev: prevDist / 1000,    fmt: (v: number) => `${v.toFixed(0)} km` },
              { label: 'SM Total',   curr: totalTss,           prev: prevTss,            fmt: (v: number) => Math.round(v).toString() },
              { label: 'RPE Moyen',  curr: rpeVals.length ? avg(rpeVals) : 0, prev: prevMeanRpe, fmt: (v: number) => v ? `${v.toFixed(1)}/10` : '—' },
            ]
            return (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {stats.map(({ label, curr, prev, fmt }) => {
                  const tr = trendOf(curr, prev)
                  return (
                    <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px 16px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', marginBottom: 6 }}>{label}</div>
                      <div className="stat-number" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginBottom: 4 }}>{fmt(curr)}</div>
                      <div style={{ fontSize: 11, color: tr.color, fontWeight: 600 }}>
                        {tr.arrow} {tr.pct !== 0 ? `${Math.abs(tr.pct).toFixed(0)}%` : 'Stable'}
                        {tr.pct > 25 && <span style={{ color: '#EF4444', marginLeft: 4, fontSize: 10 }}>surcharge?</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* ── SECTION 4: Volume + Polarisation ────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 16 }}>

            {/* LEFT: Volume hebdo */}
            {(() => {
              const DISP = 10
              const maxBlockOffset = Math.max(0, Math.floor((weeks.length - 1) / DISP))
              const safeOffset = Math.min(weekBlockOffset, maxBlockOffset)
              const sliceEnd   = weeks.length - safeOffset * DISP
              const sliceStart = Math.max(0, sliceEnd - DISP)
              const weekSlice  = weeks.slice(sliceStart, sliceEnd)
              const maxSliceTime = Math.max(...weekSlice.map(w => w.total), 1)
              const isLatest = safeOffset === 0

              // Deltas: visible slice vs preceding 10 weeks
              const prevSlice = weeks.slice(Math.max(0, sliceStart - DISP), sliceStart)
              const sliceSportMap  = new Map<string, number>()
              const prevSportMapW  = new Map<string, number>()
              for (const w of weekSlice)  for (const [sp, t] of w.sports) sliceSportMap.set(sp, (sliceSportMap.get(sp) ?? 0) + t)
              for (const w of prevSlice)  for (const [sp, t] of w.sports) prevSportMapW.set(sp, (prevSportMapW.get(sp) ?? 0) + t)

              // SVG chart constants
              const VH_T = 22, VH_B = 20, VH_H = 200, VH_W = 600
              const VH_CH = VH_H - VH_T - VH_B
              const SLOT_W = VH_W / DISP
              const BAR_W = Math.round(SLOT_W * 0.56)
              const BASE_Y = VH_T + VH_CH

              return (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <SectionTitle>Volume hebdomadaire</SectionTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Deltas discrets */}
                      {prevSlice.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {Array.from(sliceSportMap.entries()).slice(0, 3).map(([sp, curr]) => {
                            const prev = prevSportMapW.get(sp) ?? 0
                            if (!prev) return null
                            const pct = ((curr - prev) / prev) * 100
                            if (Math.abs(pct) < 3) return null
                            const col  = SPORT_COLOR[sp as SportType] ?? '#888'
                            const color = pct > 0 ? '#10B981' : '#F97316'
                            return (
                              <div key={sp} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{ width: 6, height: 6, borderRadius: 1, background: col, display: 'inline-block' }} />
                                <span style={{ color }}>{pct > 0 ? '↑' : '↓'}{Math.abs(Math.round(pct))}%</span>
                              </div>
                            )
                          }).filter(Boolean)}
                        </div>
                      )}
                      {/* Navigation */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => setWeekBlockOffset(v => Math.min(v + 1, maxBlockOffset))}
                          disabled={safeOffset >= maxBlockOffset}
                          style={{ width: 24, height: 24, borderRadius: '50%', border: `1px solid ${T.border}`, background: T.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: safeOffset >= maxBlockOffset ? 'default' : 'pointer', opacity: safeOffset >= maxBlockOffset ? 0.3 : 1, padding: 0 }}
                        >
                          <ChevronLeft size={12} color={T.textMuted} />
                        </button>
                        {weekSlice.length > 0 && (
                          <span style={{ fontSize: 10, color: T.textMuted, whiteSpace: 'nowrap' }}>
                            {new Date(weekSlice[0].week).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            {' – '}
                            {new Date(weekSlice[weekSlice.length - 1].week).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        <button
                          onClick={() => setWeekBlockOffset(v => Math.max(v - 1, 0))}
                          disabled={isLatest}
                          style={{ width: 24, height: 24, borderRadius: '50%', border: `1px solid ${T.border}`, background: T.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isLatest ? 'default' : 'pointer', opacity: isLatest ? 0.3 : 1, padding: 0 }}
                        >
                          <ChevronRight size={12} color={T.textMuted} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SVG chart */}
                  <svg
                    viewBox={`0 0 ${VH_W} ${VH_H}`}
                    preserveAspectRatio="none"
                    style={{ width: '100%', height: 200, display: 'block', overflow: 'visible' }}
                  >
                    {/* Baseline */}
                    <line x1={0} y1={BASE_Y} x2={VH_W} y2={BASE_Y} stroke="var(--border)" strokeWidth="1" />

                    {weekSlice.map((w, i) => {
                      const barH = w.total > 0 ? Math.max(3, (w.total / maxSliceTime) * (VH_CH - 6)) : 0
                      const isNow = isLatest && i === weekSlice.length - 1
                      const bx    = i * SLOT_W + (SLOT_W - BAR_W) / 2
                      const sportEntries = Array.from(w.sports.entries()).sort((a, b) => b[1] - a[1])
                      const durLabel = w.time >= 60 ? fmtDur(w.time) : ''
                      const dateLabel = new Date(w.week).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                      const labelY = Math.max(VH_T + 11, BASE_Y - barH - 4)

                      // Stack segments bottom → top
                      let segY = BASE_Y
                      const segs = sportEntries.map(([sp, spTime]) => {
                        const h = Math.max(0, (spTime / maxSliceTime) * (VH_CH - 6))
                        const seg = { sp, h, y: segY - h }
                        segY -= h
                        return seg
                      })

                      return (
                        <g key={w.week} onClick={() => w.count > 0 && setSelectedWeek(w)}
                          style={{ cursor: w.count > 0 ? 'pointer' : 'default' }}
                          onMouseEnter={e => { const el = e.currentTarget; el.style.opacity = w.count > 0 ? '0.75' : '1' }}
                          onMouseLeave={e => { (e.currentTarget as SVGGElement).style.opacity = '1' }}
                        >
                          {/* Empty bar placeholder */}
                          {w.total === 0 && (
                            <rect x={bx} y={BASE_Y - 2} width={BAR_W} height={2} fill="var(--border)" rx="1" />
                          )}
                          {/* Sport segments */}
                          {segs.map((seg, si) => (
                            <rect
                              key={seg.sp}
                              x={bx} y={seg.y} width={BAR_W} height={Math.max(0.5, seg.h)}
                              fill={isNow ? (SPORT_COLOR[seg.sp as SportType] ?? '#94a3b8') : ((SPORT_COLOR[seg.sp as SportType] ?? '#94a3b8') + 'AA')}
                              rx={si === 0 ? 2 : 0}
                            />
                          ))}
                          {/* Duration label above bar */}
                          {durLabel && (
                            <text
                              x={bx + BAR_W / 2} y={labelY}
                              textAnchor="middle" fontSize="8"
                              fill={isNow ? 'var(--text)' : 'var(--text-dim)'}
                              fontWeight={isNow ? '700' : '400'}
                            >
                              {durLabel}
                            </text>
                          )}
                          {/* Date label below */}
                          <text
                            x={bx + BAR_W / 2} y={VH_H - 4}
                            textAnchor="middle" fontSize="8"
                            fill={isNow ? 'var(--text)' : 'var(--text-dim)'}
                          >
                            {dateLabel}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {/* Legend */}
                  {(() => {
                    const sportSet = new Set<string>()
                    for (const w of weekSlice) for (const [sp] of w.sports) sportSet.add(sp)
                    const sportList = Array.from(sportSet)
                    return sportList.length > 1 ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {sportList.map(sp => (
                          <div key={sp} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: T.textSub }}>
                            <span style={{ width: 7, height: 7, borderRadius: 2, background: SPORT_COLOR[sp as SportType] ?? '#888', display: 'inline-block' }} />
                            {SPORT_LABEL[sp as SportType] ?? sp}
                          </div>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
              )
            })()}

            {/* RIGHT: Polarisation */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px' }}>
              <SectionTitle>Répartition polarisation</SectionTitle>
              {polTotal > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Endurance fondamentale', zones: 'Z1–Z2', time: polZ12, color: '#10B981' },
                    { label: 'Tempo',                   zones: 'Z3',    time: polZ3,  color: '#F97316' },
                    { label: 'Haute intensité',          zones: 'Z4–Z5', time: polZ45, color: '#EF4444' },
                  ].map(({ label, zones, time, color }) => {
                    const pct = polTotal > 0 ? (time / polTotal) * 100 : 0
                    return (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>{zones}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{fmtDur(time)}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 4, transition: 'width 0.5s',
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${color}88, ${color})`,
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 16 }}>
                  Données FC insuffisantes sur la période
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 5: Heatmap calendrier ───────────────────────────────── */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <SectionTitle>Calendrier des charges</SectionTitle>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                background: 'rgba(6,182,212,0.15)', color: '#06B6D4',
                padding: '2px 7px', borderRadius: 10, marginBottom: 14,
              }}>Nouveau</span>
            </div>
            {(() => {
              const heatDays = Math.min(displayDays, 365)
              const today = new Date()
              // Build list of days from (today - heatDays) to today
              const startDay = new Date(today); startDay.setDate(startDay.getDate() - heatDays)
              // Align to Monday
              const dow = startDay.getDay()
              const offset = dow === 0 ? 6 : dow - 1
              startDay.setDate(startDay.getDate() - offset)
              const days: Array<{ date: string; col: number; row: number }> = []
              let col = 0, row = 0
              const cur = new Date(startDay)
              while (cur <= today) {
                days.push({ date: cur.toISOString().slice(0, 10), col, row })
                cur.setDate(cur.getDate() + 1)
                row++
                if (row === 7) { row = 0; col++ }
              }
              const numCols = col + (row > 0 ? 1 : 0)
              const CELL = isMobile ? 10 : 12, GAP = 2, LABEL_H = 20
              const svgW = numCols * (CELL + GAP)
              const svgH = 7 * (CELL + GAP) + LABEL_H
              const tssColor = (tssVal: number) => {
                if (!tssVal) return 'var(--border)'
                if (tssVal < 50)  return '#BFDBFE'
                if (tssVal < 100) return '#60A5FA'
                if (tssVal < 150) return '#F97316'
                return '#EF4444'
              }
              // Month labels
              const monthLabels = new Map<number, string>()
              for (const d of days) {
                const dt = new Date(d.date)
                if (dt.getDate() <= 7) {
                  monthLabels.set(d.col, dt.toLocaleDateString('fr-FR', { month: 'short' }))
                }
              }
              return (
                <div style={{ position: 'relative', overflowX: 'auto' }}>
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ height: svgH, minWidth: Math.min(svgW, 600), display: 'block' }}
                    preserveAspectRatio="xMinYMin meet">
                    {/* Month labels */}
                    {Array.from(monthLabels.entries()).map(([c, label]) => (
                      <text key={c} x={c * (CELL + GAP)} y={10} fontSize="9" fill="var(--text-dim)">{label}</text>
                    ))}
                    {/* Cells */}
                    {days.map(({ date, col: c, row: r }) => {
                      const entry = tssByDate.get(date)
                      const tssVal = entry?.tss ?? 0
                      const color = tssColor(tssVal)
                      const x = c * (CELL + GAP)
                      const y = LABEL_H + r * (CELL + GAP)
                      return (
                        <rect key={date}
                          x={x} y={y} width={CELL} height={CELL}
                          rx="2" ry="2"
                          fill={color}
                          style={{ cursor: tssVal ? 'pointer' : 'default' }}
                          onMouseEnter={() => tssVal && setHeatHover({ date, tss: tssVal, title: entry?.title ?? '' })}
                          onMouseLeave={() => setHeatHover(null)}
                        />
                      )
                    })}
                  </svg>
                  {/* Heatmap tooltip */}
                  {heatHover && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
                      padding: '8px 12px', fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10,
                    }}>
                      <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 2 }}>
                        {new Date(heatHover.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>SM {heatHover.tss}</div>
                      {heatHover.title && <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{heatHover.title}</div>}
                    </div>
                  )}
                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 10, color: 'var(--text-dim)' }}>
                    <span>Repos</span>
                    {[0, 25, 75, 125, 160].map((v, i) => (
                      <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: tssColor(v) }} />
                    ))}
                    <span>Intensité élevée</span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* ── SECTION 6: Zones (3 colonnes) ───────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
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
// JAUGES RESSENTI / DIFFICULTÉ
// Arcs minimalistes style Whoop/Oura : 3/4 cercle, chiffre central,
// couleur sémantique selon valeur. Saisie via modal portalisé.
// ─────────────────────────────────────────────────────────────

const FD_ARC_TOTAL = 217  // 3/4 de circonférence (2π × 46 ≈ 289)
const FD_ARC_FULL  = 289

const FEELING_THRESHOLDS = [
  { max: 1.5, color: '#ef4444', label: 'Triste' },
  { max: 3,   color: '#eab308', label: 'Normal' },
  { max: 4.5, color: '#10b981', label: 'Bien' },
  { max: 5,   color: '#06b6d4', label: 'Incroyable' },
]
const DIFFICULTY_THRESHOLDS = [
  { max: 3,   color: '#10b981', label: 'Facile' },
  { max: 5,   color: '#84cc16', label: 'Modérée' },
  { max: 6,   color: '#eab308', label: 'Un peu dur' },
  { max: 7.5, color: '#f97316', label: 'Difficile' },
  { max: 9,   color: '#ef4444', label: 'Très difficile' },
  { max: 10,  color: '#991b1b', label: 'Terrible' },
]
function feelingDescriptor(v: number)    { return FEELING_THRESHOLDS.find(t => v <= t.max) ?? FEELING_THRESHOLDS[FEELING_THRESHOLDS.length - 1] }
function difficultyDescriptor(v: number) { return DIFFICULTY_THRESHOLDS.find(t => v <= t.max) ?? DIFFICULTY_THRESHOLDS[DIFFICULTY_THRESHOLDS.length - 1] }
function fdFormat(v: number): string     { return Number.isInteger(v) ? `${v}` : v.toString().replace('.', ',') }

function GaugeArc({ value, max, denomLabel, label, descriptor, onEdit }: {
  value:      number | null
  max:        number
  denomLabel: string
  label:      string
  descriptor: { color: string; label: string } | null
  onEdit:     () => void
}) {
  const isSet  = value != null
  const ratio  = isSet ? Math.max(0, Math.min(1, (value as number) / max)) : 0
  const filled = ratio * FD_ARC_TOTAL
  const color  = isSet && descriptor ? descriptor.color : 'var(--border)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 110, height: 110 }}>
        <svg width={110} height={110} viewBox="0 0 110 110">
          <circle cx={55} cy={55} r={46}
                  stroke="var(--border)" strokeWidth={6} fill="none"
                  strokeDasharray={`${FD_ARC_TOTAL} ${FD_ARC_FULL}`}
                  transform="rotate(135 55 55)" strokeLinecap="round" />
          {isSet && (
            <circle cx={55} cy={55} r={46}
                    stroke={color} strokeWidth={6} fill="none"
                    strokeDasharray={`${filled} ${FD_ARC_FULL}`}
                    transform="rotate(135 55 55)" strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.4s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease' }} />
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div
            key={isSet ? String(value) : 'empty'}
            style={{
              fontSize: 32, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              color: isSet ? 'var(--text)' : 'var(--text-dim)',
              animation: isSet ? 'fdGaugePulse 0.3s ease-out' : undefined,
            }}
          >{isSet ? fdFormat(value as number) : '—'}</div>
          {isSet && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontWeight: 500 }}>
              {denomLabel}
            </div>
          )}
        </div>
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: 'var(--text-dim)', marginTop: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: isSet ? 'var(--text)' : 'var(--text-dim)',
        fontStyle: isSet ? 'normal' : 'italic',
        transition: 'color 0.3s ease',
      }}>{isSet && descriptor ? descriptor.label : 'Non renseigné'}</div>
      <button onClick={onEdit} style={{
        fontSize: 11, color: '#06b6d4', textDecoration: 'underline',
        cursor: 'pointer', background: 'none', border: 'none', padding: '8px 14px', marginTop: 0,
      }}>{isSet ? 'Modifier' : 'Ajouter'}</button>
    </div>
  )
}

function GaugeEditModal({ open, kind, value, onClose, onSave }: {
  open:    boolean
  kind:    'feeling' | 'difficulty'
  value:   number | null
  onClose: () => void
  onSave:  (v: number) => Promise<void>
}) {
  const max = kind === 'feeling' ? 5 : 10
  const [draft,  setDraft]  = useState<number>(value ?? max / 2)
  const [saving, setSaving] = useState(false)
  // Garde anti « ghost click » mobile : le tap qui ouvre la modale génère un
  // click synthétique ~300ms plus tard qui retombait sur le backdrop et la
  // refermait aussitôt (→ « rien ne se passe »). On ignore la fermeture par
  // backdrop tant que la modale n'est pas « prête ».
  const [ready,  setReady]  = useState(false)
  useEffect(() => {
    setDraft(value ?? max / 2); setSaving(false)
    if (!open) { setReady(false); return }
    setReady(false)
    const t = setTimeout(() => setReady(true), 350)
    return () => clearTimeout(t)
  }, [value, open, max])
  if (!open || typeof document === 'undefined') return null
  const descriptor = kind === 'feeling' ? feelingDescriptor(draft) : difficultyDescriptor(draft)
  const color  = descriptor.color
  const filled = (draft / max) * FD_ARC_TOTAL
  const title  = kind === 'feeling' ? 'Ressenti' : 'Difficulté'
  return createPortal(
    <>
      <style>{`
        @keyframes fdGaugePulse  { 0%{transform:scale(0.92);opacity:0.6} 50%{transform:scale(1.05);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes fdModalBackdrop { from{opacity:0} to{opacity:1} }
        @keyframes fdModalEnter  { from{opacity:0;transform:translate(-50%,-46%) scale(0.96)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
      `}</style>
      <div onClick={() => { if (ready) onClose() }} style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        animation: 'fdModalBackdrop 0.2s ease-out',
      }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          background: 'var(--bg)', borderRadius: 16,
          padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          width: '90vw', maxWidth: 380,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          animation: 'fdModalEnter 0.22s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: 20, padding: 4,
          }}>✕</button>
        </div>
        {/* Aperçu gauge en grand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg width={140} height={140} viewBox="0 0 110 110" preserveAspectRatio="xMidYMid meet">
              <circle cx={55} cy={55} r={46}
                      stroke="var(--border)" strokeWidth={6} fill="none"
                      strokeDasharray={`${FD_ARC_TOTAL} ${FD_ARC_FULL}`}
                      transform="rotate(135 55 55)" strokeLinecap="round" />
              <circle cx={55} cy={55} r={46}
                      stroke={color} strokeWidth={6} fill="none"
                      strokeDasharray={`${filled} ${FD_ARC_FULL}`}
                      transform="rotate(135 55 55)" strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.4s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div
                key={String(draft)}
                style={{
                  fontSize: 36, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: 'var(--text)',
                  animation: 'fdGaugePulse 0.3s ease-out',
                }}
              >{fdFormat(draft)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>sur {max}</div>
            </div>
          </div>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 8,
            transition: 'color 0.3s ease',
          }}>
            {descriptor.label}
          </div>
        </div>
        {/* Slider 0.5 step */}
        <input
          type="range" min={0} max={max} step={0.5} value={draft}
          onChange={e => setDraft(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: color, marginBottom: 6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginBottom: 20 }}>
          <span>0</span><span>{max}</span>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} disabled={saving} style={{
            flex: 1, padding: '12px 16px', borderRadius: 10,
            background: 'var(--bg-card2)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Annuler</button>
          <button
            onClick={async () => { setSaving(true); await onSave(draft) }}
            disabled={saving}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              background: '#06b6d4', border: 'none',
              color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >{saving ? '…' : 'Enregistrer'}</button>
        </div>
      </div>
    </>,
    document.body,
  )
}

function FeelingDifficultyCard({ feeling, difficulty, onEdit }: {
  feeling:    number | null
  difficulty: number | null
  onEdit:     (kind: 'feeling' | 'difficulty') => void
}) {
  const fDesc = feeling    !== null ? feelingDescriptor(feeling)       : null
  const dDesc = difficulty !== null ? difficultyDescriptor(difficulty) : null

  return (
    <div style={{
      background: 'var(--bg-card2)', borderRadius: 14, padding: 20,
      margin: '16px 0',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
    }}>
      <GaugeArc value={feeling}    max={5}  denomLabel="sur 5"  label="RESSENTI"   descriptor={fDesc} onEdit={() => onEdit('feeling')} />
      <GaugeArc value={difficulty} max={10} denomLabel="sur 10" label="DIFFICULTÉ" descriptor={dDesc} onEdit={() => onEdit('difficulty')} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ACTIVITY DETAIL
// ─────────────────────────────────────────────────────────────
function ActivityDetail({ a, onClose, closing = false, zones, profile }: {
  a: Activity; onClose: () => void; closing?: boolean
  zones: TrainingZoneRow[]; profile: Profile
}) {
  const width    = useWindowWidth()
  const isMobile = width < 768
  const col = SPORT_COLOR[a.sport_type] ?? T.accent
  const { compute: computeSmSn } = useSmSn()
  const smsn = computeSmSn(a as Parameters<typeof computeSmSn>[0])

  // Partage (image récap, style Strava) de l'activité.
  function shareThisActivity() {
    const isG = a.sport_type === 'gym' || a.sport_type === 'hyrox'
    const terrain = ['run', 'trail_run', 'bike', 'virtual_bike'].includes(a.sport_type)
    const km = a.distance_m ? `${(Number(a.distance_m) / 1000).toFixed(1)} km` : null
    const stats: { label: string; value: string }[] = [
      { label: 'Durée', value: fmtDur(a.moving_time_s) },
      ...(km && !isG ? [{ label: 'Distance', value: km }] : []),
      ...(terrain && (a.elevation_gain_m ?? 0) > 5 ? [{ label: 'D+', value: `+${Math.round(Number(a.elevation_gain_m))} m` }] : []),
      { label: 'SM', value: String(smsn.sm) },
      { label: 'SN', value: String(smsn.sn) },
    ]
    void shareCard({
      title: a.title ?? SPORT_LABEL[a.sport_type],
      subtitle: `${SPORT_LABEL[a.sport_type]} · ${fmtDate(a.started_at)}`,
      accent: col.startsWith('#') ? col : '#06B6D4',
      stats, filename: 'hybrid-activite.png',
    })
  }

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

  // ── Ref carte mobile ─────────────────────────────────────────────────
  const mobileMapRef = useRef<HTMLDivElement>(null)

  // ── Sheet draggable + zoom map (mobile uniquement) ───────────────────
  // Stratégie : pendant le drag, on bypasse complètement React. Aucun
  // setState dans onSheetTouchMove → aucun re-render → zéro backpressure.
  // - sheetRef + isDraggingRef + currentOffsetRef remplacent les states
  // - On manipule le DOM direct (sheet + .leaflet-container)
  // - UN seul setSheetPos au touchend pour persister le snap dans React
  // Sheet plein écran type Strava : 3 positions (low/mid/full) exprimées en
  // translateY (px depuis le haut). La carte plein écran derrière se recadre
  // (fitBounds animé) selon la hauteur couverte par la sheet (= winH - translateY).
  // Sans trace GPS (muscu, natation piscine, hyrox, box, tapis…) : pas de carte
  // → la sheet s'ouvre directement en plein écran (on n'affiche que les données).
  const hasGpsInit = (a.streams?.latlng?.length ?? 0) > 0 || !!a.summary_polyline
  const [sheetPos, setSheetPos] = useState<'low' | 'mid' | 'full'>(hasGpsInit ? 'mid' : 'full')
  const [winH,     setWinH]     = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  )
  const [mapBottomInset, setMapBottomInset] = useState(0)

  const sheetRef       = useRef<HTMLDivElement>(null)
  const isDraggingRef  = useRef(false)
  const currentTyRef   = useRef(0)
  const dragStartY     = useRef(0)
  const dragStartTy    = useRef(0)

  const snapTy = useCallback((pos: 'low' | 'mid' | 'full'): number => {
    if (pos === 'low')  return winH * 0.80   // sheet en bas → carte ~80% visible
    if (pos === 'full') return 0              // sheet plein écran (jusqu'en haut)
    return winH * 0.46                        // mid (défaut)
  }, [winH])
  const insetForTy = useCallback((ty: number) => Math.max(0, winH - ty), [winH])

  // Recalcule winH au resize
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setWinH(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Applique la position au mount / resize / changement de snap (hors drag).
  useEffect(() => {
    if (winH <= 0 || isDraggingRef.current) return
    const ty = snapTy(sheetPos)
    currentTyRef.current = ty
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.34s cubic-bezier(0.2,0.8,0.2,1)'
      sheetRef.current.style.transform  = `translateY(${ty}px)`
    }
    setMapBottomInset(insetForTy(ty))
  }, [sheetPos, winH, snapTy, insetForTy])

  function onSheetTouchStart(e: React.TouchEvent) {
    isDraggingRef.current = true
    dragStartY.current  = e.touches[0].clientY
    dragStartTy.current = currentTyRef.current
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }

  function onSheetTouchMove(e: React.TouchEvent) {
    if (!isDraggingRef.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    const ty = Math.max(snapTy('full'), Math.min(snapTy('low'), dragStartTy.current + delta))
    currentTyRef.current = ty
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${ty}px)`  // direct DOM, 60fps
  }

  function onSheetTouchEnd() {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const ty = currentTyRef.current
    const nearest = (['low', 'mid', 'full'] as const)
      .map(p => ({ p, v: snapTy(p) }))
      .reduce((b, c) => Math.abs(c.v - ty) < Math.abs(b.v - ty) ? c : b)
    currentTyRef.current = nearest.v
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.34s cubic-bezier(0.2,0.8,0.2,1)'
      sheetRef.current.style.transform  = `translateY(${nearest.v}px)`
    }
    setSheetPos(nearest.p)               // persiste le snap (recadre la carte via effet)
    setMapBottomInset(insetForTy(nearest.v))
  }

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
  const isTrail = a.sport_type === 'trail_run'
  const isSwim = a.sport_type === 'swim'
  const isGym  = a.sport_type === 'gym'
  const isHyrox = a.sport_type === 'hyrox'
  const isRowing = a.sport_type === 'rowing'
  // Terrain (D+, altitude) : pertinent uniquement pour les sports outdoor à
  // dénivelé (running/trail/vélo). Masqué pour natation, muscu, hyrox, aviron.
  const showTerrainData = isRun || isBike
  // Natation : eau libre si tracé GPS présent, sinon piscine.
  const hasGpsTrace = (a.streams?.latlng?.length ?? 0) > 0 || !!a.summary_polyline
  const isOpenWater = isSwim && hasGpsTrace
  const isPool = isSwim && !isOpenWater
  // Aviron : indoor si pas de tracé GPS.
  const isRowingOutdoor = isRowing && hasGpsTrace

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

  // Durée Z2 PUISSANCE : secondes passées en zone 2 de puissance (basée FTP).
  // Masqué si pas de stream watts ou pas de zones de puissance configurées.
  const z2DurationS = useMemo(() => {
    const wattsStream = a.streams?.watts
    if (!wattsStream || !wattsStream.length || !bikeZones || bikeZones.length < 2) return null
    const z2 = bikeZones[1]
    const time = a.streams?.time
    // Détection du pas de temps (en s) pour multiplier le nombre de samples
    let dt = 1
    if (time && time.length > 10) {
      dt = (time[10] - time[0]) / 10
      if (!dt || dt <= 0) dt = 1
    }
    const samples = wattsStream.filter(v => v != null && v >= z2.min && v < z2.max).length
    return Math.round(samples * dt)
  }, [a.streams?.watts, a.streams?.time, bikeZones])

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

  // ── Jauges Ressenti / Difficulté (single source of truth dans ActivityDetail) ──
  const { showToast: fdToast } = useToast()
  const [localFeeling,    setLocalFeeling]    = useState<number | null>(typeof a.feeling    === 'number' ? a.feeling    : null)
  const [localDifficulty, setLocalDifficulty] = useState<number | null>(typeof a.difficulty === 'number' ? a.difficulty : null)
  const [fdEditing,       setFdEditing]       = useState<null | 'feeling' | 'difficulty'>(null)
  const [lapsViewOpen,    setLapsViewOpen]    = useState(false)
  const [lapsViewInitial, setLapsViewInitial] = useState(0)
  async function saveFdValue(kind: 'feeling' | 'difficulty', v: number) {
    const sb = createClient()
    // eslint-disable-next-line no-console
    console.log('[JAUGES] Saving:', { activityId: a.id, field: kind, value: v })
    const { data, error } = await sb.from('activities').update({ [kind]: v }).eq('id', a.id).select()
    // eslint-disable-next-line no-console
    console.log('[JAUGES] Save result:', { data, error })
    if (error) {
      fdToast(`Échec : ${error.message}`)
      return
    }
    if (kind === 'feeling') setLocalFeeling(v); else setLocalDifficulty(v)
    setFdEditing(null)
    fdToast('Enregistré')
  }

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
Analyse le découplage puissance/FC. Sois CONCIS (max 300 mots). Utilise du markdown.

Données :
- Découplage P/FC : ${decoupling?.toFixed(1) ?? '—'}%
- Durée : ${fmtDur(a.moving_time_s)} | TSS : ${a.tss ? Math.round(Number(a.tss)) : '—'} | IF : ${ifVal ?? '—'}
- Watts moy : ${a.avg_watts ? Math.round(Number(a.avg_watts)) : '—'}W | NP : ${np ?? '—'}W | FTP : ${ftp ?? '—'}W
- FC 1ère moitié : ${fc1 ?? '—'}bpm | FC 2ème moitié : ${fc2 ?? '—'}bpm
- Température moy : ${tempMoy ?? '—'}°C | Température max : ${tempMax ?? '—'}°C

Structure ta réponse EXACTEMENT ainsi :

## PARTIE 1 : ANALYSE TECHNIQUE

### Découplage ${decoupling?.toFixed(1) ?? '—'}%
2-3 phrases d'interprétation maximum.

| Paramètre | Valeur | Interprétation |
|-----------|--------|----------------|
| Puissance moy | ${a.avg_watts ? Math.round(Number(a.avg_watts)) : '—'}W | ... |
| FC 1ère moitié | ${fc1 ?? '—'}bpm | ... |
| FC 2ème moitié | ${fc2 ?? '—'}bpm | ... |

### Facteurs clés
3 points maximum, une phrase chacun.

---EN CLAIR---

2-3 phrases simples. Ce que ça veut dire concrètement.
1 conseil pratique.

**Score : X/10** — une phrase de conclusion.`
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
      {/* Édition Ressenti / Difficulté — montée ici (sharedModals) pour s'afficher
          AUSSI sur mobile ; le mount desktop-only ne s'ouvrait jamais au tap mobile. */}
      <GaugeEditModal
        open={fdEditing !== null}
        kind={fdEditing ?? 'feeling'}
        value={fdEditing === 'feeling' ? localFeeling : localDifficulty}
        onClose={() => setFdEditing(null)}
        onSave={async v => { if (fdEditing) await saveFdValue(fdEditing, v) }}
      />
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center' }}>
            SM<TooltipInfo text={'SM — Score Métabolique\n\nCharge cardio-vasculaire et énergétique : intensité relative, durée, chaleur, dénivelé positif.'} />
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{smsn.sm}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center' }}>
            SN<TooltipInfo text={'SN — Score Neuromusculaire\n\nCharge mécanique et musculaire : efforts explosifs, impacts, descentes, volume de force.'} />
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{smsn.sn}</span>
        </div>
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
        {decoupling != null && !isRun && (
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
            {decoupling != null && !isRun && (
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
        {showTerrainData && (a.elevation_gain_m ?? 0) > 5 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>D+</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>+{Math.round(Number(a.elevation_gain_m))} m</span>
          </div>
        )}
        {showTerrainData && maxAlt != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>Alt. max.</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{maxAlt} m</span>
          </div>
        )}
        {showTerrainData && avgAlt != null && (
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

  // ── Two-path return: mobile (linéaire) vs desktop (inchangé) ──
  // DIAGNOSTIC : les anciennes tentatives utilisaient `position:fixed` sur la carte
  // + `minHeight:100vh` sur le wrapper + `marginTop:52vh` sur le sheet. Le bug
  // `containing block` (transform retenu par <div.fade-up> et <ScrollReveal>)
  // empêchait la carte de se résoudre au viewport → carte « tout en bas » +
  // placeholder 100vh vide → gros espace blanc.
  // FIX : layout strictement linéaire — la carte est dans le flux normal,
  // height: 50vh, et le contenu suit. Plus de fixed, plus de min-height,
  // plus d'animation slideUp. Scroll classique géré par le <main> parent.
  return isMobile ? createPortal((
    /* ══════════════════════════════════════════
       MOBILE — fiche activité plein écran type Strava.
       Overlay fixed (portal body) → couvre header + onglets + tab bar.
       Carte plein écran DERRIÈRE, sheet flottante draggable à 3 positions
       (low/mid/full). La carte se recadre (fitBounds animé) selon la hauteur
       couverte par la sheet (bottomInset).
    ══════════════════════════════════════════ */
    <>
      <style>{`
        @keyframes thwActSheetIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        .thw-actsheet-in { animation: thwActSheetIn 0.32s cubic-bezier(0.32,0.72,0,1); }
        @media (prefers-reduced-motion: reduce) { .thw-actsheet-in { animation: none; } }
      `}</style>
      <div
        data-fullscreen-activity=""
        className={closing ? undefined : 'thw-actsheet-in'}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000, background: 'var(--bg)', overflow: 'hidden',
          transform: closing ? 'translateX(100%)' : undefined,
          transition: closing ? 'transform 0.26s cubic-bezier(0.32,0.72,0,1)' : undefined,
        }}
      >

        {/* ── CARTE plein écran (derrière la sheet) ── */}
        <div
          ref={mobileMapRef}
          className="thw-activity-map-sticky"
          style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}
        >
          {polylinePoints && polylinePoints.length >= 2 ? (
            <ActivityMapCard
              activity={a as unknown as Record<string, unknown>}
              mobileHero={true}
              hoverGps={hoverGps}
              bottomInset={mapBottomInset}
            />
          ) : (
            // Pas de GPS → fond neutre (la sheet plein écran le recouvre). Plus
            // de placeholder coloré (l'ancien fond orange muscu).
            <div style={{ width: '100%', height: '100%', background: 'var(--bg)' }} />
          )}
        </div>

        {/* ── Bouton retour flottant (par-dessus la carte) ── */}
        <button
          onClick={onClose}
          aria-label="Retour"
          className="thw-activity-back-btn"
          style={{
            position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: 12,
            zIndex: 10, width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)', padding: 0,
          }}
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>

        {/* ── SHEET draggable plein écran (transform via ref, 60fps) ── */}
        <div
          ref={sheetRef}
          data-bottom-sheet=""
          className="thw-activity-sheet"
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, height: '100dvh', zIndex: 2,
            background: 'var(--bg)', borderRadius: sheetPos === 'full' ? '0' : '20px 20px 0 0',
            boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.18)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
            paddingTop: sheetPos === 'full' ? 'env(safe-area-inset-top, 0px)' : 0,
            paddingBottom: 120,
            transform: `translateY(${snapTy(sheetPos)}px)`,
          }}
        >
          {/* Handle (drag) — sticky en haut de la sheet */}
          <div
            className="thw-activity-sheet-handle"
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
            onTouchCancel={onSheetTouchEnd}
            style={{ position: 'sticky', top: 0, zIndex: 3, background: 'var(--bg)', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'var(--info-border)' }} />
          </div>

          {/* Nom + sport + date */}
          <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
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
            <button onClick={() => shareThisActivity()} aria-label="Partager" style={{
              flexShrink: 0, width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
            </button>
          </div>

          {/* Type d'entraînement (mobile, tous sports) — sélection manuelle */}
          <div style={{ padding: '0 16px' }}>
            <WorkoutTypeBadges activityId={a.id} sport={a.sport_type} />
          </div>

          {/* Muscu : séance enregistrée (fusion in-app) ou saisie manuelle */}
          {isGym && (
            <div style={{ padding: '0 16px' }}>
              <MuscuSessionPanel activity={a} />
            </div>
          )}

          {/* Natation piscine : nombre de longueurs (bassin saisi par l'athlète) */}
          {isPool && (
            <div style={{ padding: '0 16px' }}>
              <SwimLengths activityId={a.id} distanceM={a.distance_m} />
            </div>
          )}

          {/* Jauges Ressenti / Difficulté (mobile) */}
          <div style={{ padding: '0 16px' }}>
            <FeelingDifficultyCard feeling={localFeeling} difficulty={localDifficulty} onEdit={setFdEditing} />
          </div>

          {/* Records battus — sous la carte (mobile) */}
          <div style={{ padding: '0 16px' }}>
            <RecordsBeaten activityId={a.id} isBike={isBike} />
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
              showTerrainData
                ? { label: 'D+', value: elevGainVal ?? '—' }
                : { label: 'Calories', value: a.calories ? `${Math.round(Number(a.calories))} kcal` : '—' },
              { label: 'SM · SN',    value: `${smsn.sm} · ${smsn.sn}` },
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
                  { label: 'W/kg',          value: isBike && wkgMoy ? `${wkgMoy} w/kg` : null },
                  { label: 'Roue libre',    value: isBike && freewheelPowerS && freewheelPowerS > 60 ? `${fmtDur(freewheelPowerS)} (${freewheelPowerPct}%)` : null },
                  { label: 'Durée Z2',      value: z2DurationS && z2DurationS > 60 ? fmtDur(z2DurationS) : null },
                  { label: 'Découplage P/FC', value: (!isRun && decoupling != null) ? `${decoupling.toFixed(1)}%` : null },
                  { label: 'FC max',        value: (a.max_hr ?? maxHrStream) != null ? `${a.max_hr ?? maxHrStream} bpm (${Math.round((Number(a.max_hr ?? maxHrStream)/maxHrEst)*100)}%)` : null },
                  { label: 'D+',            value: showTerrainData && (a.elevation_gain_m ?? 0) > 5 ? `+${Math.round(Number(a.elevation_gain_m))} m` : null },
                  { label: 'Alt. max.',     value: showTerrainData && maxAlt != null ? `${maxAlt} m` : null },
                  { label: 'Alt. moy.',     value: showTerrainData && avgAlt != null ? `${avgAlt} m` : null },
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
                <ActivityCurves activity={a} />
              </Section>
            )}

            {/* ZONES (jauges Z1-Z5 + toggle) — supprimée : donuts « Répartitions » conservés */}

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
                  {/* Durée cumulée par FC — cyclisme uniquement (retiré du running) */}
                  {isBike && s.heartrate && s.heartrate.length > 60 && (
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

            {/* LAPS — sur mobile, graphique en barres VERTICALES par tour
               (LapsBikeChart : 1 barre = 1 tour, couleur par zone de puissance,
                largeur ∝ durée du tour, valeur watts au-dessus, ligne moyenne
                pointillée, clic → panneau détail). Même composant que celui
                rendu sous la courbe MMP sur desktop.
               Pour les sports sans watts (run, swim, gym) : fallback tableau. */}
            {a.laps && a.laps.length > 1 && (
              <Section title={`Intervalles — ${a.laps.length} tours`}>
                {isBike && a.streams?.watts && a.streams.watts.length >= 2 ? (
                  <>
                    <LapsBikeChart
                      activityId={a.id}
                      cachedLaps={a.laps}
                      avgWatts={a.avg_watts}
                      streams={a.streams}
                      ftp={bikeZoneRow?.ftp_watts ?? null}
                      onLapTap={i => {

                        console.log('[LAPS-FORCE] Callback page reçue, ouvre la vue pour lap', i)
                        setLapsViewInitial(i)
                        setLapsViewOpen(true)
                      }}
                    />
                  </>
                ) : isRun ? (
                  <RunningLapsSection
                    activityId={a.id}
                    cachedLaps={a.laps}
                    streams={a.streams}
                    avgSpeedMs={a.distance_m && a.moving_time_s ? a.distance_m / a.moving_time_s : null}
                  />
                ) : (
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
                )}
              </Section>
            )}

            {/* DELETE */}
            <div style={{ marginTop: 32, paddingBottom: 8 }}>
              <button
                className="thw-delete-activity-btn"
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: 'block', width: '100%',
                  padding: '16px 20px', margin: '0 auto',
                  background: 'transparent', color: '#ef4444',
                  border: '2px solid #ef4444', borderRadius: 12,
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.15s ease, transform 0.1s ease',
                  fontFamily: 'inherit',
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
  ), document.body) : (
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
        <button
          className="thw-delete-activity-btn"
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            fontSize: 13, fontWeight: 600,
            color: '#ef4444', background: 'transparent',
            border: '2px solid #ef4444', borderRadius: 8,
            padding: '6px 14px', cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.15s ease, transform 0.1s ease',
            fontFamily: 'inherit',
          }}
        >
          Supprimer
        </button>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* ── Badges de type d'entraînement (tous sports) — sélection manuelle ── */}
        <WorkoutTypeBadges activityId={a.id} sport={a.sport_type} />

        {/* ── MUSCU : séance enregistrée (fusion in-app) ou saisie manuelle ── */}
        {isGym && <MuscuSessionPanel activity={a} />}

        {/* ── MUSCU : layout dédié (remplace entièrement le générique cardio) ── */}
        {isGym && (
          <MuscuActivityView
            activity={a}
            z2DurationS={z2DurationS}
            jauges={<FeelingDifficultyCard feeling={localFeeling} difficulty={localDifficulty} onEdit={setFdEditing} />}
          />
        )}

        {/* ── Autres sports : layout générique ── */}
        {!isGym && (<>

        {/* ── Bandeaux aviron indoor / natation (type d'eau) ── */}
        {isRowing && !isRowingOutdoor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card2)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 12, color: 'var(--text)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', flexShrink: 0 }} />
            <span><strong>Aviron indoor</strong> · ergomètre</span>
          </div>
        )}
        {isSwim && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card2)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 12, color: 'var(--text)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9', flexShrink: 0 }} />
            <span><strong>{isOpenWater ? 'Eau libre' : 'Piscine'}</strong>{a.avg_temp_c != null ? ` · ${Math.round(Number(a.avg_temp_c))} °C` : ''}</span>
          </div>
        )}
        {/* Natation : nombre de longueurs (bassin saisi par l'athlète) */}
        {isPool && <SwimLengths activityId={a.id} distanceM={a.distance_m} />}

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
                // Course à pied : 6 stats dédiées (Distance / Allure / D+ / FC / TSS / Allure ajustée).
                const adjPace = isRun ? avgAdjustedPaceMinKm(a.streams?.velocity, a.streams?.altitude, a.streams?.distance) : 0
                const avgMs = a.avg_speed_ms ? Number(a.avg_speed_ms) : 0
                const distAuto = a.distance_m ? (Number(a.distance_m) < 1000 ? `${Math.round(Number(a.distance_m))} m` : `${km} km`) : '—'
                const STATS_MAIN = isRun ? [
                  { label: 'Distance',       value: km ? `${km} km` : '—' },
                  { label: 'Allure moy.',    value: paceS ? fmtPace(paceS) : '—', color: '#10b981' },
                  { label: 'D+',             value: (a.elevation_gain_m ?? 0) > 5 ? `+${Math.round(Number(a.elevation_gain_m))} m` : '—' },
                  { label: 'FC moy.',        value: a.avg_hr ? `${Math.round(Number(a.avg_hr))} bpm` : '—', color: '#f97316' },
                  { label: 'SM · SN',        value: `${smsn.sm} · ${smsn.sn}` },
                  { label: 'Allure ajustée', value: adjPace > 0 ? `${fmtPaceMinKm(adjPace)}/km` : '—', color: '#7c3aed' },
                ] : isRowing ? [
                  { label: 'Distance',  value: distAuto },
                  { label: 'Durée',     value: a.moving_time_s ? fmtDur(a.moving_time_s) : '—' },
                  { label: 'Split moy', value: avgMs > 0 ? `${formatSplit(500 / avgMs)}/500` : '—', color: '#06b6d4' },
                  { label: 'SPM moy',   value: a.avg_cadence ? `${Math.round(Number(a.avg_cadence))}` : '—', color: '#ec4899' },
                  { label: 'FC moy.',   value: a.avg_hr ? `${Math.round(Number(a.avg_hr))} bpm` : '—', color: '#f97316' },
                  { label: 'Puiss. moy', value: a.avg_watts ? `${Math.round(Number(a.avg_watts))} W` : '—', color: '#6366f1' },
                ] : isSwim ? [
                  { label: 'Distance',     value: distAuto },
                  { label: 'Durée',        value: a.moving_time_s ? fmtDur(a.moving_time_s) : '—' },
                  { label: 'Allure /100m', value: avgMs > 0 ? formatPaceSwim(100 / avgMs) : '—', color: '#0ea5e9' },
                  { label: 'FC moy.',      value: a.avg_hr ? `${Math.round(Number(a.avg_hr))} bpm` : '—', color: '#f97316' },
                  { label: 'Cadence',      value: a.avg_cadence ? `${Math.round(Number(a.avg_cadence))} c/min` : '—', color: '#ec4899' },
                  { label: 'SM · SN',      value: `${smsn.sm} · ${smsn.sn}` },
                ] : [
                  { label: 'Distance',  value: km ? `${km} km` : '—' },
                  { label: 'Durée',     value: a.moving_time_s ? fmtDur(a.moving_time_s) : '—' },
                  { label: 'Vitesse',   value: avgSpeedKmh ? `${avgSpeedKmh} km/h` : '—' },
                  { label: isBike ? 'Watts moy.' : 'Allure',
                    value: isBike ? (a.avg_watts ? `${Math.round(Number(a.avg_watts))} W` : '—') : (paceS ? fmtPace(paceS) : '—'),
                    color: isBike ? '#818CF8' : undefined },
                  showTerrainData
                    ? { label: 'D+', value: (a.elevation_gain_m ?? 0) > 5 ? `+${Math.round(Number(a.elevation_gain_m))} m` : '—' }
                    : { label: 'Calories', value: a.calories ? `${Math.round(Number(a.calories))} kcal` : '—' },
                  { label: 'SM · SN',   value: `${smsn.sm} · ${smsn.sn}` },
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
                    {decoupling !== null && !isRun && (
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

        {/* ── Jauges Ressenti / Difficulté (desktop) ── */}
        <FeelingDifficultyCard feeling={localFeeling} difficulty={localDifficulty} onEdit={setFdEditing} />

        {/* ── Records battus — sous la carte (desktop) ── */}
        <RecordsBeaten activityId={a.id} isBike={isBike} />

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
                ...(isTrail ? (() => { const vam = trailVam(a.streams); return [{ label: 'VAM', value: vam > 0 ? `${vam} m/h` : null }] })() : []),
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
                    {decoupling !== null && !isRun && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Découplage P/FC</span>
                        <span style={{ fontWeight: 500, color: decoupling < 5 ? '#10B981' : 'var(--text)' }}>{decoupling.toFixed(1)}%</span>
                      </div>
                    )}
                    {z2DurationS != null && z2DurationS > 30 && !isRun && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Durée Z2 (puissance)</span>
                        <span style={{ fontWeight: 500, color: '#06B6D4' }}>{fmtDur(z2DurationS)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ressenti</span>
                      {localFeeling != null
                        ? <button onClick={() => setFdEditing('feeling')} style={{ fontWeight: 500, color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'inherit' }}>{fdFormat(localFeeling)} / 5</button>
                        : <button onClick={() => setFdEditing('feeling')} style={{ fontSize: 11, color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Saisir</button>
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
                { label: 'D+',         value: showTerrainData && (a.elevation_gain_m ?? 0) > 5 ? `+${Math.round(Number(a.elevation_gain_m))} m` : null },
                { label: 'Alt. max',   value: showTerrainData && maxAlt ? `${maxAlt} m` : null },
                { label: 'Alt. moy.',  value: showTerrainData && avgAlt ? `${avgAlt} m` : null },
                { label: 'Distance',   value: a.distance_m ? fmtDist(a.distance_m) : null },
              ].filter(r => r.value != null).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{r.value}</span>
                </div>
              ))}
              {/* Lignes trail : au-delà 2000 m + nb montées/descentes (mises en avant) */}
              {isTrail && (() => {
                const above = trailTimeAbove(a.streams, 2000)
                let dist = a.streams?.distance
                if (!dist && a.streams?.velocity) { dist = []; let acc = 0; for (const v of a.streams.velocity) { acc += v > 0 ? v : 0; dist.push(acc) } }
                const segs = (a.streams?.altitude && dist) ? detectSegments(a.streams.altitude, dist, a.streams.time, a.streams.velocity, a.streams.heartrate) : []
                const nClimbs = segs.filter(s => s.type === 'climb').length
                const nDesc   = segs.filter(s => s.type === 'descent').length
                const HL = (bg: string, fg: string, label: string, value: string) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', margin: '3px -4px', borderRadius: 4, background: bg, fontSize: 12 }}>
                    <span style={{ color: fg }}>{label}</span>
                    <span style={{ fontWeight: 700, color: fg }}>{value}</span>
                  </div>
                )
                return (
                  <>
                    {above.sec > 0 && HL('rgba(234,179,8,0.16)', '#b45309', 'Au-delà 2000 m', `${fmtDur(above.sec)} (${above.pct}%)`)}
                    {HL('rgba(239,68,68,0.14)',  '#dc2626', 'Montées',   String(nClimbs))}
                    {HL('rgba(59,130,246,0.14)', '#2563eb', 'Descentes', String(nDesc))}
                  </>
                )
              })()}
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
                  { label: 'SM · SN',     value: `${smsn.sm} · ${smsn.sn}` as string | undefined },
                  { label: 'TRIMP',       value: a.trimp ? Math.round(Number(a.trimp)).toString() : null,          color: undefined },
                ] as { label: string; value: string | null; color?: string }[]).filter(r => r.value != null).map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                    <span style={{ fontWeight: 500, color: r.color ?? 'var(--text)' }}>{r.value}</span>
                  </div>
                ))
              })()}
              {/* Difficulté — éditable via modal partagé */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Difficulté</span>
                {localDifficulty != null
                  ? <button onClick={() => setFdEditing('difficulty')} style={{ fontWeight: 500, color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, fontFamily: 'inherit' }}>{fdFormat(localDifficulty)} / 10</button>
                  : <button onClick={() => setFdEditing('difficulty')} style={{ fontSize: 11, color: '#06B6D4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Saisir</button>
                }
              </div>
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
            <ActivityCurves activity={a} />
          </div>
        )}

        {/* ── LAPS ── (running/trail : section inline dédiée ; vélo : LapsChart/Table watts) */}
        {isRun ? (
          <RunningLapsSection
            activityId={a.id}
            cachedLaps={a.laps}
            streams={a.streams}
            avgSpeedMs={a.distance_m && a.moving_time_s ? a.distance_m / a.moving_time_s : null}
          />
        ) : a.laps && a.laps.length > 1 ? (
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
        ) : null}

        {/* ── ZONES (jauges Z1-Z5 + toggle) — supprimée : on garde les donuts « Répartitions » ── */}

        {/* ── DONUTS course/trail — FC + (Altitude trail | Cadence run) + Température ── */}
        {isRun && (() => {
          const n = a.streams?.altitude?.length ?? a.streams?.heartrate?.length ?? a.streams?.cadence?.length ?? 0
          const dt = streamDt(a.streams, n)
          const tempTimes = zoneTimesFromStream(a.streams?.temp, TEMP_ZONES_PARSED, dt)
          const donuts: { title: string; zones: ParsedZone[]; times: number[] }[] = []
          if (hrTimesZ && hrTimesZ.some(t => t > 0)) donuts.push({ title: 'FC zones', zones: hrZones, times: hrTimesZ })
          if (isTrail) {
            const altTimes = zoneTimesFromStream(a.streams?.altitude, ALTITUDE_ZONES_DEF, dt)
            if (altTimes.some(t => t > 0)) donuts.push({ title: 'Altitude', zones: ALTITUDE_ZONES_DEF, times: altTimes })
          } else {
            const cadTimes = zoneTimesFromStream(a.streams?.cadence, CADENCE_RUN_ZONES_DEF, dt)
            if (cadTimes.some(t => t > 0)) donuts.push({ title: 'Cadence', zones: CADENCE_RUN_ZONES_DEF, times: cadTimes })
          }
          if (tempTimes.some(t => t > 0)) donuts.push({ title: 'Température', zones: TEMP_ZONES_PARSED, times: tempTimes })
          if (!donuts.length) return null
          return (
            <div style={{ marginBottom: 32, paddingTop: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
                Répartitions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                {donuts.map(d => (
                  <div key={d.title}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, marginBottom: 10 }}>{d.title}</div>
                    <DonutChart zones={d.zones} timesS={d.times} />
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── DONUTS CYCLISME — Puissance / FC / Cadence / Altitude / Température ── */}
        {isBike && (() => {
          const n = a.streams?.watts?.length ?? a.streams?.heartrate?.length ?? a.streams?.altitude?.length ?? 0
          const dt = streamDt(a.streams, n)
          const cadTimes  = zoneTimesFromStream(a.streams?.cadence, CADENCE_BIKE_ZONES_PARSED, dt)
          const altTimes  = zoneTimesFromStream(a.streams?.altitude, ALTITUDE_ZONES_DEF, dt)
          const tempTimes = zoneTimesFromStream(a.streams?.temp, TEMP_ZONES_PARSED, dt)
          const donuts: { title: string; zones: ParsedZone[]; times: number[] }[] = []
          if (bikeZones && powerTimesZ && powerTimesZ.some(t => t > 0)) donuts.push({ title: 'Puissance', zones: bikeZones, times: powerTimesZ })
          if (hrTimesZ && hrTimesZ.some(t => t > 0))                    donuts.push({ title: 'FC zones',  zones: hrZones, times: hrTimesZ })
          if (cadTimes.some(t => t > 0))                                donuts.push({ title: 'Cadence',   zones: CADENCE_BIKE_ZONES_PARSED, times: cadTimes })
          if (altTimes.some(t => t > 0))                                donuts.push({ title: 'Altitude',  zones: ALTITUDE_ZONES_DEF, times: altTimes })
          if (tempTimes.some(t => t > 0))                               donuts.push({ title: 'Température', zones: TEMP_ZONES_PARSED, times: tempTimes })
          if (!donuts.length) return null
          return (
            <div style={{ marginBottom: 32, paddingTop: 24 }}>
              <style>{`
                .cyc-donuts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
                @media (min-width: 768px) { .cyc-donuts-grid { grid-template-columns: repeat(3, 1fr); } }
              `}</style>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>
                Répartitions
              </div>
              <div className="cyc-donuts-grid">
                {donuts.map(d => (
                  <div key={d.title}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, marginBottom: 10 }}>{d.title}</div>
                    <DonutChart zones={d.zones} timesS={d.times} />
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── DONUTS AVIRON — FC / SPM / Température ── */}
        {isRowing && (() => {
          const n = a.streams?.heartrate?.length ?? a.streams?.cadence?.length ?? a.streams?.watts?.length ?? 0
          const dt = streamDt(a.streams, n)
          const spmTimes  = zoneTimesFromStream(a.streams?.cadence, SPM_ROWING_ZONES_DEF, dt)
          const tempTimes = zoneTimesFromStream(a.streams?.temp, TEMP_ZONES_PARSED, dt)
          const donuts: { title: string; zones: ParsedZone[]; times: number[] }[] = []
          if (hrTimesZ && hrTimesZ.some(t => t > 0)) donuts.push({ title: 'FC zones', zones: hrZones, times: hrTimesZ })
          if (spmTimes.some(t => t > 0))  donuts.push({ title: 'SPM',         zones: SPM_ROWING_ZONES_DEF, times: spmTimes })
          if (tempTimes.some(t => t > 0)) donuts.push({ title: 'Température', zones: TEMP_ZONES_PARSED,    times: tempTimes })
          if (!donuts.length) return null
          return (
            <div style={{ marginBottom: 32, paddingTop: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>Répartitions</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                {donuts.map(d => (
                  <div key={d.title}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, marginBottom: 10 }}>{d.title}</div>
                    <DonutChart zones={d.zones} timesS={d.times} />
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── DONUTS NATATION — Cadence / Température (pas de FC zones) ── */}
        {isSwim && (() => {
          const n = a.streams?.cadence?.length ?? a.streams?.heartrate?.length ?? 0
          const dt = streamDt(a.streams, n)
          const cadTimes  = zoneTimesFromStream(a.streams?.cadence, CADENCE_SWIM_ZONES_DEF, dt)
          const tempTimes = zoneTimesFromStream(a.streams?.temp, TEMP_ZONES_PARSED, dt)
          const donuts: { title: string; zones: ParsedZone[]; times: number[] }[] = []
          if (cadTimes.some(t => t > 0))  donuts.push({ title: 'Cadence',    zones: CADENCE_SWIM_ZONES_DEF, times: cadTimes })
          if (tempTimes.some(t => t > 0)) donuts.push({ title: 'Température', zones: TEMP_ZONES_PARSED,      times: tempTimes })
          if (!donuts.length) return null
          return (
            <div style={{ marginBottom: 32, paddingTop: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 5, fontFamily: T.fontDisplay }}>Répartitions</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                {donuts.map(d => (
                  <div key={d.title}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.textSub, marginBottom: 10 }}>{d.title}</div>
                    <DonutChart zones={d.zones} timesS={d.times} />
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── ANALYSE AUTOMATIQUE ── */}
        {(() => {
          const insights: { type: 'good' | 'neutral' | 'warn'; text: string }[] = []
          if (decoupling !== null && !isRun) {
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
          const showHrCum    = isBike && !!s.heartrate && s.heartrate.length > 60
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
                  ftp={bikeZoneRow?.ftp_watts ?? null}
                />
              )}

              {/* Laps bar chart — cyclisme uniquement, sous la courbe de puissance */}
              {isBike && (
                <>
                  <LapsBikeChart
                    activityId={a.id}
                    cachedLaps={a.laps}
                    avgWatts={a.avg_watts}
                    streams={a.streams}
                    ftp={bikeZoneRow?.ftp_watts ?? null}
                    onLapTap={i => { setLapsViewInitial(i); setLapsViewOpen(true) }}
                  />
                </>
              )}

              {/* VAP / allure ajustée (GAP) — la distance est recalculée depuis
                  la vitesse si le flux distance est absent (≈ 1 échantillon/s). */}
              {isRun && s.velocity && s.altitude && s.velocity.length > 60 && (() => {
                let dist = s.distance
                if (!dist) {
                  dist = []
                  let acc = 0
                  for (const v of s.velocity) { acc += v > 0 ? v : 0; dist.push(acc) }
                }
                return <GapChart velocity={s.velocity} altitude={s.altitude} distance={dist} />
              })()}

              {/* Montées & descentes — trail uniquement, entre la comparaison
                  d'allure (VAP) et les tours. Distance recalculée si absente. */}
              {isTrail && s.altitude && s.altitude.length > 10 && (() => {
                let dist = s.distance
                if (!dist) {
                  dist = []; let acc = 0
                  for (const v of (s.velocity ?? [])) { acc += v > 0 ? v : 0; dist.push(acc) }
                }
                if (!dist || dist.length < 10) return null
                return (
                  <ClimbDescentSection
                    altitude={s.altitude}
                    distance={dist}
                    time={s.time}
                    velocity={s.velocity}
                    heartrate={s.heartrate}
                  />
                )
              })()}

              {/* Les tours running/trail sont rendus en INLINE (RunningLapsSection,
                  section LAPS ci-dessus) — pas de vue slide pour la course. */}

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

        </>)}{/* fin layout générique (!isGym) */}

      </div>

      {sharedModals}

      {/* Vue détaillée des laps (slide droite, portal sur body) */}
      <LapsDetailView
        open={lapsViewOpen}
        onClose={() => setLapsViewOpen(false)}
        initialActiveLap={lapsViewInitial}
        laps={a.laps ?? []}
        streams={a.streams ?? null}
        sportLabel={SPORT_LABEL[a.sport_type] ?? a.sport_type}
        totalDistanceM={a.distance_m ?? null}
        totalDurationS={a.moving_time_s ?? null}
        ftp={bikeZoneRow?.ftp_watts ?? null}
        bikeZones={bikeZones}
        hrZones={hrZones}
        maxHrEst={estimateMaxHr(profile.birth_date)}
        sport={isRun ? 'running' : 'cycling'}
      />
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
  const [view, setView]         = useState<'list'|'calendar'|'cards'>('list')
  // Restaure la vue depuis localStorage au mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('thw_activities_view') : null
    if (saved === 'list' || saved === 'calendar' || saved === 'cards') setView(saved)
  }, [])
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('thw_activities_view', view)
  }, [view])
  const [selected, setSelected] = useState<Activity | null>(null)
  const [detailClosing, setDetailClosing] = useState(false)
  // Fermeture animée du détail : on glisse vers la droite puis on démonte
  // (la liste réapparaît avec son propre fondu glissant). prefers-reduced-motion
  // → fermeture immédiate.
  const closeDetail = useCallback(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setSelected(null); return }
    setDetailClosing(true)
    setTimeout(() => { setSelected(null); setDetailClosing(false) }, 260)
  }, [])
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
      <div
        key="act-detail"
        className={detailClosing ? 'thw-detail-out' : 'thw-detail-in'}
        style={{ willChange: 'transform, opacity' }}
      >
        <style>{`
          @keyframes thwDetailIn  { from { opacity: 0; transform: translateX(26px) } to { opacity: 1; transform: translateX(0) } }
          @keyframes thwDetailOut { from { opacity: 1; transform: translateX(0) }    to { opacity: 0; transform: translateX(34px) } }
          /* enter: pas de fill → le transform revient à 'none' (ne confine pas les overlays fixed) */
          .thw-detail-in  { animation: thwDetailIn  0.30s cubic-bezier(0.32,0.72,0,1); }
          /* exit: forwards → garde l'état final jusqu'au démontage (~260ms) */
          .thw-detail-out { animation: thwDetailOut 0.26s cubic-bezier(0.32,0.72,0,1) forwards; }
          @media (prefers-reduced-motion: reduce) {
            .thw-detail-in, .thw-detail-out { animation: none; }
          }
        `}</style>
        {/* Bouton retour masqué sur mobile — remplacé par le header fixe dans ActivityDetail */}
        {!isMobileSA && (
          <button
            onClick={closeDetail}
            style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer', color: T.textSub, fontSize: 13, padding: 0 }}>
            <span style={{ fontSize: 16 }}>←</span> Retour à la liste
          </button>
        )}
        <ActivityDetail a={selected} onClose={closeDetail} closing={detailClosing} zones={zones} profile={profile} />
      </div>
    )
  }

  return (
    <div
      key="act-list"
      className="thw-list-in"
    >
      <style>{`
        @keyframes thwListIn { from { opacity: 0; transform: translateX(-18px) } to { opacity: 1; transform: translateX(0) } }
        .thw-list-in { animation: thwListIn 0.28s cubic-bezier(0.32,0.72,0,1) both; }
        @media (prefers-reduced-motion: reduce) { .thw-list-in { animation: none; } }
      `}</style>
      <ViewSegmented value={view} onChange={setView} />


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

      {view === 'cards' && (
        <CardsView
          activities={filtered}
          onSelect={setSelected}
          sentinelRef={sentinelRef}
          loadingMore={!!loadingMore}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// VIEW SEGMENTED (Liste · Calendrier · Cards)
// ─────────────────────────────────────────────────────────────
function ViewSegmented({ value, onChange }: {
  value:    'list' | 'calendar' | 'cards'
  onChange: (v: 'list' | 'calendar' | 'cards') => void
}) {
  const isMobile = useWindowWidth() < 640
  const options: { id: 'list'|'calendar'|'cards'; label: string; icon: React.ReactNode }[] = [
    { id: 'list',     label: 'Liste',      icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="4" y1="6"  x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    ) },
    { id: 'calendar', label: 'Calendrier', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8"  y1="2" x2="8"  y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ) },
    { id: 'cards',    label: 'Cards',      icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3"  width="8" height="8"  rx="1.5" />
        <rect x="13" y="3" width="8" height="8"  rx="1.5" />
        <rect x="3" y="13"  width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ) },
  ]
  return (
    <div style={{
      display:       'inline-flex',
      gap:           2,
      padding:       3,
      borderRadius:  8,
      border:        '1px solid var(--border)',
      background:    'transparent',
      marginBottom:  16,
    }}>
      {options.map(o => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            title={o.label}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          6,
              padding:      isMobile ? '5px 8px' : '5px 12px',
              borderRadius: 5,
              border:       'none',
              background:   active ? 'var(--bg-card2)' : 'transparent',
              color:        active ? 'var(--text)' : 'var(--text-dim)',
              fontSize:     12,
              fontWeight:   active ? 600 : 500,
              cursor:       'pointer',
              transition:   'background 0.15s, color 0.15s',
              fontFamily:   'inherit',
            }}
          >
            {o.icon}
            {!isMobile && <span>{o.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CARDS VIEW — grille de cards style Strava
// ─────────────────────────────────────────────────────────────
interface AutoRecRow {
  activity_id:    string
  distance_label: string
  performance:    string
  achieved_at:    string
}
interface BestRow { distance_label: string; performance: string }

function CardsView({ activities, onSelect, sentinelRef, loadingMore }: {
  activities:  Activity[]
  onSelect:    (a: Activity) => void
  sentinelRef: React.RefObject<HTMLDivElement | null>
  loadingMore: boolean
}) {
  const [recordsByActivity, setRecordsByActivity] = useState<Map<string, AutoRecRow[]>>(new Map())
  const [bestPerLabel,      setBestPerLabel]      = useState<Map<string, number>>(new Map())
  // Méta par activité : types d'entraînement + nb exos/circuits (muscu) — pour les cartes.
  const [metaByActivity,    setMetaByActivity]    = useState<Map<string, { types: string[]; nbExos: number | null; nbCircuits: number | null }>>(new Map())

  const visibleIds = useMemo(
    () => activities.map(a => a.id).filter(Boolean),
    [activities],
  )

  // Une seule query pour les records auto liés aux activités visibles
  useEffect(() => {
    if (visibleIds.length === 0) { setRecordsByActivity(new Map()); return }
    let cancelled = false
    void (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      // 1) Tous les records auto liés aux activités visibles
      const { data: autoRows } = await sb
        .from('personal_records')
        .select('activity_id, distance_label, performance, achieved_at')
        .eq('user_id', user.id)
        .eq('sport', 'bike')
        .eq('event_type', 'auto_session')
        .in('activity_id', visibleIds)

      // 2) Tous les records bike (manuels + auto) pour calculer le best par label
      //    → permet de séparer All Time vs simple Année
      const { data: allRows } = await sb
        .from('personal_records')
        .select('distance_label, performance')
        .eq('user_id', user.id)
        .eq('sport', 'bike')

      if (cancelled) return

      // Map records par activity_id
      const byActivity = new Map<string, AutoRecRow[]>()
      for (const r of (autoRows ?? []) as AutoRecRow[]) {
        if (!r.activity_id) continue
        const arr = byActivity.get(r.activity_id) ?? []
        arr.push(r)
        byActivity.set(r.activity_id, arr)
      }
      setRecordsByActivity(byActivity)

      // Best par distance_label (toutes sources confondues)
      const bestMap = new Map<string, number>()
      for (const r of (allRows ?? []) as BestRow[]) {
        const w = parseInt(r.performance) || 0
        if (w <= 0) continue
        const prev = bestMap.get(r.distance_label) ?? 0
        if (w > prev) bestMap.set(r.distance_label, w)
      }
      setBestPerLabel(bestMap)
    })()
    return () => { cancelled = true }
  }, [visibleIds.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Types d'entraînement + nb exos/circuits (activity_extras + séances liées).
  useEffect(() => {
    if (visibleIds.length === 0) { setMetaByActivity(new Map()); return }
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: extras } = await sb.from('activity_extras').select('activity_id, workout_types, strength_log').in('activity_id', visibleIds)
        const providerIds = activities.map(a => (a as { provider_id?: unknown }).provider_id).filter((x): x is string => typeof x === 'string')
        const wsByStrava = new Map<string, { nbExos: number; nbCircuits: number }>()
        if (providerIds.length) {
          const { data: ws } = await sb.from('workout_sessions').select('strava_activity_id, exercises_detail').not('strava_activity_id', 'is', null).in('strava_activity_id', providerIds)
          for (const w of (ws ?? []) as { strava_activity_id: string; exercises_detail: unknown }[]) {
            const exs = Array.isArray(w.exercises_detail) ? w.exercises_detail as { mode?: string }[] : []
            wsByStrava.set(w.strava_activity_id, { nbExos: exs.length, nbCircuits: Math.max(1, exs.filter(e => e.mode && e.mode !== 'series').length || 1) })
          }
        }
        const m = new Map<string, { types: string[]; nbExos: number | null; nbCircuits: number | null }>()
        for (const a of activities) {
          const ex = (extras ?? []).find(e => e.activity_id === a.id) as { workout_types?: string[]; strength_log?: { circuits?: string; exos?: { name?: string }[] } } | undefined
          const sl = ex?.strength_log
          let nbExos: number | null = null, nbCircuits: number | null = null
          if (sl && Array.isArray(sl.exos)) { nbExos = sl.exos.filter(x => x.name?.trim()).length; nbCircuits = Math.max(1, Number(sl.circuits) || 1) }
          const wm = wsByStrava.get((a as { provider_id?: string }).provider_id ?? '')
          if (wm && nbExos == null) { nbExos = wm.nbExos; nbCircuits = wm.nbCircuits }
          m.set(a.id, { types: ex?.workout_types ?? [], nbExos, nbCircuits })
        }
        if (!cancelled) setMetaByActivity(m)
      } catch { /* best-effort */ }
    })()
    return () => { cancelled = true }
  }, [visibleIds.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Benchmarks athlète pour le calcul SM/SN déterministe
  const { benchmarks: smSnBench } = useSmSn()

  // Construit les data pour chaque ActivityCard (SM/SN déterministes par activité)
  const cards: ActivityCardData[] = useMemo(() => {
    return activities.map(a => {
      const smsn = smSnFromRow(a as Parameters<typeof smSnFromRow>[0], smSnBench)
      const sportColor = SPORT_COLOR[a.sport_type] ?? '#888'
      const sportLabel = SPORT_LABEL[a.sport_type] ?? a.sport_type
      const encoded    = a.summary_polyline
        ?? ((a.raw_data as Record<string, unknown> | null)?.map as Record<string, unknown> | undefined)?.summary_polyline as string | undefined
        ?? null

      const auto    = recordsByActivity.get(a.id) ?? []
      const allTime: { label: string; watts: number }[] = []
      const year:    { label: string; watts: number; year: string }[] = []
      for (const r of auto) {
        const w = parseInt(r.performance) || 0
        if (w <= 0) continue
        const bestForLabel = bestPerLabel.get(r.distance_label) ?? 0
        const isAllTime = w >= bestForLabel
        if (isAllTime) {
          allTime.push({ label: r.distance_label, watts: w })
        } else {
          year.push({ label: r.distance_label, watts: w, year: r.achieved_at.slice(0, 4) })
        }
      }

      const meta = metaByActivity.get(a.id)
      return {
        id:               a.id,
        title:            a.title ?? null,
        sportType:        a.sport_type,
        sportLabel,
        sportColor,
        startedAt:        a.started_at,
        distance_m:       a.distance_m ? Number(a.distance_m) : null,
        moving_time_s:    a.moving_time_s ? Number(a.moving_time_s) : null,
        elevation_gain_m: a.elevation_gain_m ? Number(a.elevation_gain_m) : null,
        sm:               smsn.sm,
        sn:               smsn.sn,
        encodedPolyline:  encoded,
        records:          { allTime, year },
        trainingTypes:    meta?.types ?? [],
        nbExercises:      meta?.nbExos ?? null,
        nbCircuits:       meta?.nbCircuits ?? null,
      } satisfies ActivityCardData
    })
  }, [activities, recordsByActivity, bestPerLabel, smSnBench, metaByActivity])

  if (cards.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: T.textMuted, fontSize: 14 }}>
        Aucune activité
      </div>
    )
  }

  return (
    <>
      <div className="thw-cards-grid">
        {cards.map(c => (
          <ActivityCard
            key={c.id}
            data={c}
            onClick={() => {
              const act = activities.find(a => a.id === c.id)
              if (act) onSelect(act)
            }}
          />
        ))}
      </div>
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && (
        <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: T.textMuted }}>Chargement…</div>
      )}
      <style>{`
        .thw-cards-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (min-width: 768px) {
          .thw-cards-grid { grid-template-columns: 1fr 1fr; gap: 16px; }
        }
      `}</style>
    </>
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

const NAV: { id: Section; label: string; desc: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'donnees',     label: 'Données',     desc: 'Charge et volume',      Icon: BarChart2 },
  { id: 'analyse',     label: 'Analyse',     desc: 'Activités et détails',  Icon: Search },
  // Onglet « Progression » retiré (trop complexe) — à réactiver plus tard.
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
  const { show: showHelp, dismiss: dismissHelp } = usePageOnboarding(TRAINING_ONBOARDING.pageId, TRAINING_ONBOARDING.version)
  const zones   = useTrainingZones()
  const profile = useProfile()
  const [section, setSection]       = useState<Section>('donnees')
  const [progSport, setProgSport]   = useState<string | null>(null)
  const [sectionOpen, setSectionOpen] = useState(false)
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
  // Deep-link depuis Planning : ?id=<activity_id> → ouvre directement la section analyse
  const [deepLinkId, setDeepLinkId] = useState<string|null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) { setDeepLinkId(id); setSection('analyse') }
  }, [])

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

  const tabs: PageTab<Section>[] = NAV.map(n => ({ id: n.id, label: n.label, subtitle: n.desc, icon: n.Icon as unknown as LucideIcon }))
  const topControls = (
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
              <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={() => setAppMenuOpen(false)}>
                <div
                  style={{
                    position: 'absolute',
                    top: menuPos.top, right: menuPos.right,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    minWidth: 220,
                    overflow: 'hidden',
                    animation: 'fadeUp 200ms ease-out',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div style={{ padding: '10px 14px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
                    Connexions
                  </div>
                  {[
                    { name: 'Strava', logo: 'strava', color: '#FC4C02', initial: 'ST', connected: stravaConnected, onPress: () => syncStrava() },
                    { name: 'Garmin', logo: null,     color: '#007CC3', initial: 'GC', connected: garminConnected, onPress: () => handleFileImport() },
                    { name: 'Polar',  logo: 'polar',  color: '#D9001B', initial: 'PO', connected: polarConnected,  onPress: () => syncPolar() },
                  ].map((svc, i, arr) => (
                    <button
                      key={svc.name}
                      onClick={() => { svc.onPress(); setAppMenuOpen(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer', textAlign: 'left', border: 'none',
                        background: 'transparent',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      {/* Logo */}
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                        background: svc.logo ? '#fff' : svc.color,
                        border: svc.logo ? '1px solid rgba(0,0,0,0.08)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {svc.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/logos/apps/${svc.logo}.png`} alt={svc.name} width={22} height={22} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
                        ) : (
                          <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', fontFamily: 'Syne,sans-serif' }}>{svc.initial}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', flex: 1 }}>{svc.name}</span>
                      {svc.connected
                        ? <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✓ Connecté</span>
                        : <span style={{ fontSize: 11, color: '#06B6D4' }}>{svc.name === 'Garmin' ? 'Importer' : 'Connecter'}</span>
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
          </div>
  )
  return (
    <>
      <TabbedPageLayout title="Training" headerExtra={topControls} tabs={tabs} active={section} onChange={setSection}>

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
          {section === 'progression' && (
            <div className="fade-up">
              {progSport
                ? <ProgressionSportView sport={progSport} onBack={() => setProgSport(null)} />
                : <ProgressionHub onSelectSport={setProgSport} />}
            </div>
          )}
      </TabbedPageLayout>

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

    </>
  )
}
