'use client'

// ══════════════════════════════════════════════════════════════════
// TrainingAnalysis — « Analyse de l'entraînement » desktop (course /
// trail / rando). Benchmark : Strava. Un seul composant qui pilote,
// via 5 boutons (Temps/km · Tours · Lissé + Allure · VAP), TROIS blocs
// synchronisés :
//   1. la COURBE (profil altimétrique gris + barres/ligne d'allure),
//   2. le TABLEAU statique des splits,
//   3. les JAUGES en grand (barres cliquables → LapsDetailView).
// Allure = bleu, VAP = violet. Bascule = même géométrie recalculée sur
// la vitesse ajustée à la pente. Animation fluide au changement de mode.
//
// Mapping streams obligatoire côté appelant : r.streams ?? r.raw_data?.streams.
// Null-safety systématique sur chaque colonne (backfill partiel).
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { formatPace } from '@/lib/utils/pace'
import { computeVapKmh, distanceFromVelocity } from '@/lib/utils/vap'
import { useI18n } from '@/lib/i18n'

// ── Types (miroir de page.tsx, gardés locaux pour l'autonomie) ──────────
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
  lap_index?:        number
  start_index?:      number
  end_index?:        number
  distance_m:        number
  moving_time_s:     number
  elapsed_time_s?:   number | null
  avg_hr?:           number | null
  avg_speed_ms?:     number | null
  avg_cadence?:      number | null
  elevation_gain_m?: number | null
  temp_avg?:         number | null
}
interface PaceZone { label: string; color: string; min: number; max: number }

type Mode   = 'km' | 'laps' | 'smooth'
type Metric = 'pace' | 'vap'

interface Split {
  label:     string    // "1", "2"… (km) ou "1", "2"… (tour)
  distM:     number
  durS:      number
  startDist: number
  endDist:   number
  speedMs:   number    // vitesse plate moyenne (allure)
  vapMs:     number    // vitesse ajustée pente moyenne (VAP)
  dPlus:     number
  avgHr:     number | null
  avgTemp:   number | null
  zone:      number | null   // index 0..4 dans les zones d'allure
  lapIndex:  number          // index du tour englobant (pour le modal)
}

interface SmoothSample {
  dist:     number
  speedMs:  number
  vapMs:    number
  alt:      number
  time:     number
  dPlusCum: number
}

// ── Palettes d'intensité (rapide = foncé). Allure=bleu, VAP=violet ──────
const PACE_BLUE   = ['#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB'] as const
const VAP_VIOLET  = ['#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED'] as const
const ACCENT_PACE = '#2563EB'
const ACCENT_VAP  = '#7C3AED'

function rampColor(speed: number, min: number, max: number, ramp: readonly string[]): string {
  if (max <= min) return ramp[3]
  const r = (speed - min) / (max - min)
  const idx = Math.max(0, Math.min(ramp.length - 1, Math.round(r * (ramp.length - 1))))
  return ramp[idx]
}

function paceStr(speedMs: number): string {
  if (speedMs <= 0) return '—'
  return formatPace(1000 / speedMs / 60).replace('"', '')  // "4'30"
}
function fmtDurShort(s: number): string {
  if (!s || s <= 0) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
function fmtDistKm(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2).replace('.', ',')} km`
  return `${Math.round(m)} m`
}

function zoneIndex(speedMs: number, zones: PaceZone[] | null | undefined): number | null {
  if (!zones || zones.length === 0 || speedMs <= 0) return null
  const paceSecKm = 1000 / speedMs           // s/km
  for (let i = 0; i < zones.length; i++) {
    if (paceSecKm >= zones[i].min && paceSecKm <= zones[i].max) return i
  }
  return null
}

// ── Calcul de tout le jeu de données depuis les streams + laps ──────────
function useAnalysisData(streams: StreamData | null, laps: LapData[], zones: PaceZone[] | null | undefined) {
  return useMemo(() => {
    const velocity = streams?.velocity ?? null
    const altitude = streams?.altitude ?? null
    const hr       = streams?.heartrate ?? null
    const temp     = streams?.temp ?? null
    const time     = streams?.time ?? null
    if (!velocity || velocity.length < 2) {
      return null
    }
    const dist = streams?.distance && streams.distance.length === velocity.length
      ? streams.distance
      : distanceFromVelocity(velocity)
    const alt = altitude && altitude.length === velocity.length ? altitude : null
    const vapKmh = alt ? computeVapKmh(velocity, alt, dist) : velocity.map(v => v * 3.6)
    const N = velocity.length
    const dtAt = (i: number): number => {
      if (time && time.length === N) {
        if (i === 0) return Math.max(0, (time[1] ?? 1) - (time[0] ?? 0))
        return Math.max(0, (time[i] ?? 0) - (time[i - 1] ?? 0))
      }
      return 1
    }
    const totalDist = dist[N - 1] ?? 0

    // ── Splits par km ────────────────────────────────────────────────
    const kmSplits: Split[] = []
    {
      const nKm = Math.max(1, Math.ceil(totalDist / 1000))
      for (let k = 0; k < nKm; k++) {
        const dStart = k * 1000
        const dEnd = Math.min((k + 1) * 1000, totalDist)
        let i0 = 0, i1 = N - 1
        for (let i = 0; i < N; i++) { if (dist[i] >= dStart) { i0 = i; break } }
        for (let i = i0; i < N; i++) { if (dist[i] >= dEnd) { i1 = i; break }; i1 = i }
        kmSplits.push(buildSplit(String(k + 1), i0, i1, dist, velocity, vapKmh, alt, hr, temp, dtAt, zones, laps))
      }
    }

    // ── Splits par tour ──────────────────────────────────────────────
    const lapSplits: Split[] = laps.map((lap, li) => {
      const i0 = lap.start_index ?? 0
      const i1 = lap.end_index ?? (li < laps.length - 1 ? (laps[li + 1].start_index ?? N - 1) : N - 1)
      const sp = buildSplit(String(li + 1), Math.min(i0, N - 1), Math.min(i1, N - 1), dist, velocity, vapKmh, alt, hr, temp, dtAt, zones, laps)
      // Préfère les valeurs officielles du tour quand présentes.
      if (lap.avg_speed_ms && lap.avg_speed_ms > 0) sp.speedMs = lap.avg_speed_ms
      else if (lap.distance_m > 0 && lap.moving_time_s > 0) sp.speedMs = lap.distance_m / lap.moving_time_s
      if (lap.moving_time_s > 0) sp.durS = lap.moving_time_s
      if (lap.distance_m > 0) sp.distM = lap.distance_m
      if (lap.avg_hr != null) sp.avgHr = lap.avg_hr
      if (lap.elevation_gain_m != null) sp.dPlus = lap.elevation_gain_m
      sp.zone = zoneIndex(sp.speedMs, zones)
      sp.lapIndex = li
      return sp
    })

    // ── Échantillons lissés (≈240 pts) pour la ligne + le profil ─────
    const target = 240
    const step = Math.max(1, Math.floor(N / target))
    const smooth: SmoothSample[] = []
    let dPlusCum = 0
    let prevAlt = alt ? alt[0] : 0
    for (let i = 0; i < N; i += step) {
      if (alt) {
        const d = alt[i] - prevAlt
        if (d > 0) dPlusCum += d
        prevAlt = alt[i]
      }
      smooth.push({
        dist: dist[i],
        speedMs: velocity[i] > 0 ? velocity[i] : 0,
        vapMs: (vapKmh[i] ?? 0) / 3.6,
        alt: alt ? alt[i] : 0,
        time: time && time.length === N ? time[i] : i,
        dPlusCum,
      })
    }

    // Moyennes + extrêmes (par métrique)
    const movingV = velocity.filter(v => v > 0.3)
    const avgSpeed = movingV.length ? movingV.reduce((a, b) => a + b, 0) / movingV.length : 0
    const movingVap = vapKmh.filter(v => v > 1)
    const avgVap = movingVap.length ? (movingVap.reduce((a, b) => a + b, 0) / movingVap.length) / 3.6 : 0

    const hasAlt = !!alt

    return {
      kmSplits, lapSplits, smooth, totalDist,
      avgSpeed, avgVap, hasAlt,
      altMin: alt ? Math.min(...alt) : 0,
      altMax: alt ? Math.max(...alt) : 0,
    }
  }, [streams, laps, zones])
}

function buildSplit(
  label: string, i0: number, i1: number,
  dist: number[], velocity: number[], vapKmh: number[],
  alt: number[] | null, hr: number[] | null, temp: number[] | null,
  dtAt: (i: number) => number, zones: PaceZone[] | null | undefined, laps: LapData[],
): Split {
  const a = Math.max(0, Math.min(i0, i1)), b = Math.max(i0, i1)
  const distM = Math.max(0, (dist[b] ?? 0) - (dist[a] ?? 0))
  let durS = 0
  for (let i = a + 1; i <= b; i++) durS += dtAt(i)
  const speedMs = durS > 0 ? distM / durS : 0
  // VAP moyenne : vitesse ajustée moyenne sur le segment (m/s)
  let vSum = 0, vN = 0
  for (let i = a; i <= b; i++) { const v = vapKmh[i]; if (v > 1) { vSum += v; vN++ } }
  const vapMs = vN ? (vSum / vN) / 3.6 : speedMs
  // D+ cumulé positif
  let dPlus = 0
  if (alt) for (let i = a + 1; i <= b; i++) { const d = alt[i] - alt[i - 1]; if (d > 0) dPlus += d }
  // FC moyenne
  let hSum = 0, hN = 0
  if (hr) for (let i = a; i <= b; i++) { const h = hr[i]; if (h > 0) { hSum += h; hN++ } }
  const avgHr = hN ? hSum / hN : null
  // Température moyenne
  let tSum = 0, tN = 0
  if (temp) for (let i = a; i <= b; i++) { const tp = temp[i]; if (tp != null) { tSum += tp; tN++ } }
  const avgTemp = tN ? tSum / tN : null
  // Tour englobant (pour ouvrir le modal depuis une jauge km)
  const mid = (a + b) >> 1
  let lapIndex = 0
  for (let li = 0; li < laps.length; li++) {
    const ls = laps[li].start_index ?? 0
    const le = laps[li].end_index ?? (li < laps.length - 1 ? (laps[li + 1].start_index ?? Infinity) : Infinity)
    if (mid >= ls && mid <= le) { lapIndex = li; break }
  }
  return {
    label, distM, durS, startDist: dist[a] ?? 0, endDist: dist[b] ?? 0,
    speedMs, vapMs, dPlus, avgHr, avgTemp,
    zone: zoneIndex(speedMs, zones), lapIndex,
  }
}

// ══════════════════════════════════════════════════════════════════
// Composant principal
// ══════════════════════════════════════════════════════════════════
interface Props {
  streams:        StreamData | null
  laps:           LapData[] | null
  activityId:     string
  totalDurationS: number | null
  paceZones?:     PaceZone[] | null
  onLapTap?:      (lapIndex: number) => void
  kpiNode?:       ReactNode
  mapNode?:       ReactNode
  feelingNode?:   ReactNode
}

export function TrainingAnalysis({ streams, laps: lapsProp, activityId, totalDurationS, paceZones, onLapTap, kpiNode, mapNode, feelingNode }: Props) {
  const { t } = useI18n()
  const [mode, setMode]     = useState<Mode>('km')
  const [metric, setMetric] = useState<Metric>('pace')

  // Laps : prop, sinon self-fetch (comme LapsRunChart).
  const [laps, setLaps] = useState<LapData[]>(lapsProp && lapsProp.length > 1 ? lapsProp : [])
  useEffect(() => {
    if (lapsProp && lapsProp.length > 1) { setLaps(lapsProp); return }
    let alive = true
    fetch(`/api/strava/activity-laps?activity_id=${activityId}`)
      .then(r => r.json())
      .then((d: { laps?: LapData[] }) => { if (alive && d.laps) setLaps(d.laps) })
      .catch(() => {})
    return () => { alive = false }
  }, [activityId, lapsProp])

  const hasLaps = laps.length > 1
  // Si le mode courant devient indisponible (pas de tours), rebascule.
  useEffect(() => { if (mode === 'laps' && !hasLaps) setMode('km') }, [mode, hasLaps])

  const data = useAnalysisData(streams, laps, paceZones)

  const splits = mode === 'laps' ? (data?.lapSplits ?? []) : (data?.kmSplits ?? [])

  if (!data || (data.kmSplits.length === 0 && !hasLaps)) {
    return kpiNode || mapNode ? (
      <TwoCol left={<>{kpiNode}</>} right={<>{mapNode}{feelingNode}</>} />
    ) : null
  }

  const accent = metric === 'pace' ? ACCENT_PACE : ACCENT_VAP
  const ramp   = metric === 'pace' ? PACE_BLUE : VAP_VIOLET

  const controls = (
    <AnalysisControls mode={mode} metric={metric} hasLaps={hasLaps} onMode={setMode} onMetric={setMetric} t={t} />
  )

  return (
    <div>
      {/* Ligne 1 : (KPIs + courbe) | (carte + ressenti/difficulté) */}
      <TwoCol
        left={
          <>
            {kpiNode}
            <AnalysisCurve data={data} splits={splits} mode={mode} metric={metric} accent={accent} ramp={ramp} totalDurationS={totalDurationS} t={t} />
            {controls}
          </>
        }
        right={<>{mapNode}{feelingNode}</>}
      />

      {/* Ligne 2 : tableau statique */}
      <AnalysisTable splits={splits} mode={mode} t={t} />

      {/* Ligne 3 : jauges en grand (cliquables → modal tour, si vrais laps) */}
      <AnalysisGauges data={data} splits={splits} mode={mode} metric={metric} accent={accent} ramp={ramp}
        onTap={hasLaps && onLapTap ? (sp) => onLapTap(sp.lapIndex) : undefined} t={t} />
    </div>
  )
}

// Grille 2 colonnes responsive (>= 900px : 2 col, sinon empilé).
function TwoCol({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="thw-ta-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22, alignItems: 'start' }}>
      <style>{`@media (max-width: 899px){ .thw-ta-2col{ grid-template-columns: 1fr !important; } }
        @keyframes thwTaRise { from { opacity: 0; transform: translateY(6px) scaleY(0.9); } to { opacity: 1; transform: none; } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>{left}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>{right}</div>
    </div>
  )
}

// ── 5 boutons ───────────────────────────────────────────────────────────
function AnalysisControls({ mode, metric, hasLaps, onMode, onMetric, t }: {
  mode: Mode; metric: Metric; hasLaps: boolean
  onMode: (m: Mode) => void; onMetric: (m: Metric) => void
  t: (k: string) => string
}) {
  const seg = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    borderRadius: 8, border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'),
    background: active ? 'var(--text)' : 'transparent',
    color: active ? 'var(--bg)' : 'var(--text-mid)',
    fontFamily: 'inherit', transition: 'all .15s ease', whiteSpace: 'nowrap',
  })
  const modes: { k: Mode; label: string }[] = [
    { k: 'km',     label: t('actp.splits_time') },
    ...(hasLaps ? [{ k: 'laps' as Mode, label: t('actp.laps') }] : []),
    { k: 'smooth', label: t('actp.smoothed') },
  ]
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {modes.map(m => <button key={m.k} onClick={() => onMode(m.k)} style={seg(mode === m.k)}>{m.label}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onMetric('pace')} style={seg(metric === 'pace')}>{t('actp.pace')}</button>
        <button onClick={() => onMetric('vap')} style={seg(metric === 'vap')}>VAP</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// COURBE — profil altimétrique (gris) + barres/ligne d'allure
// ══════════════════════════════════════════════════════════════════
type AData = NonNullable<ReturnType<typeof useAnalysisData>>

function speedOf(sp: Split, metric: Metric): number { return metric === 'pace' ? sp.speedMs : sp.vapMs }
function smoothSpeed(s: SmoothSample, metric: Metric): number { return metric === 'pace' ? s.speedMs : s.vapMs }

// Géométrie partagée courbe / jauges.
function computeGeom(data: AData, splits: Split[], metric: Metric, chartH: number, vbw = 1000) {
  const VBW = vbw, PAD_L = 46, PAD_R = 52, PAD_T = 16, PAD_B = 24
  const innerW = VBW - PAD_L - PAD_R
  const baseY = PAD_T + chartH
  const speeds = splits.map(s => speedOf(s, metric)).filter(s => s > 0)
  const smoothSpeeds = data.smooth.map(s => smoothSpeed(s, metric)).filter(s => s > 0)
  const allSpeeds = speeds.concat(smoothSpeeds)
  const maxSpeed = allSpeeds.length ? Math.max(...allSpeeds) : 1
  const minSpeed = allSpeeds.length ? Math.min(...allSpeeds) : 0
  const maxY = maxSpeed * 1.06 || 1
  const yOf = (sp: number) => PAD_T + chartH - Math.max(0, Math.min(1, sp / maxY)) * chartH
  const xOf = (dist: number) => PAD_L + (data.totalDist > 0 ? dist / data.totalDist : 0) * innerW
  // Altitude compressée sur la bande basse (55 % → base).
  const altTop = PAD_T + chartH * 0.5
  const altSpan = Math.max(1, data.altMax - data.altMin)
  const altYOf = (alt: number) => baseY - ((alt - data.altMin) / altSpan) * (baseY - altTop)
  return { VBW, PAD_L, PAD_R, PAD_T, PAD_B, innerW, baseY, chartH, maxSpeed, minSpeed, maxY, yOf, xOf, altTop, altSpan, altYOf }
}

function altitudePath(data: AData, g: ReturnType<typeof computeGeom>): string {
  if (!data.hasAlt || data.smooth.length < 2) return ''
  let d = `M ${g.PAD_L} ${g.baseY}`
  for (const s of data.smooth) d += ` L ${g.xOf(s.dist).toFixed(1)} ${g.altYOf(s.alt).toFixed(1)}`
  d += ` L ${g.xOf(data.smooth[data.smooth.length - 1].dist).toFixed(1)} ${g.baseY} Z`
  return d
}

function xAxisTicks(data: AData, g: ReturnType<typeof computeGeom>): { x: number; label: string }[] {
  const totalKm = data.totalDist / 1000
  const out: { x: number; label: string }[] = []
  for (let km = 2; km <= totalKm + 0.001; km += 2) out.push({ x: g.xOf(km * 1000), label: `${km}` })
  return out
}

function yPaceTicks(g: ReturnType<typeof computeGeom>): { y: number; label: string }[] {
  const out: { y: number; label: string }[] = []
  const steps = 4
  for (let i = 1; i <= steps; i++) {
    const sp = (g.maxY / steps) * i
    out.push({ y: g.yOf(sp), label: paceStr(sp) })
  }
  return out
}
function yAltTicks(data: AData, g: ReturnType<typeof computeGeom>): { y: number; label: string }[] {
  if (!data.hasAlt) return []
  const out: { y: number; label: string }[] = []
  const lo = Math.floor(data.altMin / 100) * 100
  const hi = Math.ceil(data.altMax / 100) * 100
  const stepM = Math.max(50, Math.round(((hi - lo) / 3) / 50) * 50)
  for (let a = lo; a <= hi; a += stepM) {
    const y = g.altYOf(a)
    if (y <= g.baseY && y >= g.PAD_T) out.push({ y, label: `${a} m` })
  }
  return out.slice(0, 4)
}

function AnalysisCurve({ data, splits, mode, metric, accent, ramp, totalDurationS, t }: {
  data: AData; splits: Split[]; mode: Mode; metric: Metric
  accent: string; ramp: readonly string[]; totalDurationS: number | null
  t: (k: string) => string
}) {
  const CH = 168
  const g = computeGeom(data, splits, metric, CH, 720)
  const [hover, setHover] = useState<number | null>(null)
  const [smoothT, setSmoothT] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const avgSpeed = metric === 'pace' ? data.avgSpeed : data.avgVap
  const avgY = avgSpeed > 0 ? g.yOf(avgSpeed) : null

  // Extrêmes (km/lissé uniquement) sur les splits.
  const fastIdx = splits.reduce((best, s, i, arr) => speedOf(s, metric) > speedOf(arr[best], metric) ? i : best, 0)
  const slowIdx = splits.reduce((worst, s, i, arr) => (speedOf(s, metric) > 0 && speedOf(s, metric) < speedOf(arr[worst], metric)) ? i : worst, 0)
  const showMarkers = mode !== 'laps'

  function onMove(clientX: number) {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const xVB = ((clientX - rect.left) / rect.width) * g.VBW
    if (mode === 'smooth') {
      const ratio = Math.max(0, Math.min(1, (xVB - g.PAD_L) / g.innerW))
      setSmoothT(ratio)
    } else {
      // trouve la barre sous le curseur
      let acc = g.PAD_L
      const widths = barWidths(splits, g, mode)
      for (let i = 0; i < splits.length; i++) {
        if (xVB >= acc && xVB < acc + widths[i]) { setHover(i); return }
        acc += widths[i]
      }
      setHover(null)
    }
  }
  function clearHover() { setHover(null); setSmoothT(null) }

  const widths = barWidths(splits, g, mode)
  const xs: number[] = []
  { let c = g.PAD_L; for (let i = 0; i < splits.length; i++) { xs.push(c); c += widths[i] } }

  return (
    <div style={{ position: 'relative' }}>
      <SectionTitle text={t('actp.training_analysis')} />
      <div
        ref={wrapRef}
        onMouseMove={e => onMove(e.clientX)}
        onMouseLeave={clearHover}
        style={{ position: 'relative', width: '100%', paddingBottom: `${((CH + g.PAD_T + g.PAD_B) / g.VBW) * 100}%`, cursor: 'crosshair' }}
      >
        <svg viewBox={`0 0 ${g.VBW} ${CH + g.PAD_T + g.PAD_B}`} preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          {/* profil altimétrique */}
          {data.hasAlt && <path d={altitudePath(data, g)} fill="var(--border)" opacity={0.5} stroke="none" />}
          {/* grille + Y allure */}
          {yPaceTicks(g).map((m, i) => (
            <g key={'yp' + i}>
              <line x1={g.PAD_L} y1={m.y} x2={g.VBW - g.PAD_R} y2={m.y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
              <text x={g.PAD_L - 5} y={m.y + 3} textAnchor="end" fontSize={11} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.label}</text>
            </g>
          ))}
          {/* Y altitude (droite) */}
          {yAltTicks(data, g).map((m, i) => (
            <text key={'ya' + i} x={g.VBW - g.PAD_R + 5} y={m.y + 3} textAnchor="start" fontSize={10} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.label}</text>
          ))}
          {/* X distance (tous les 2 km) */}
          {xAxisTicks(data, g).map((m, i) => (
            <text key={'x' + i} x={m.x} y={CH + g.PAD_T + 16} textAnchor="middle" fontSize={11} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.label}</text>
          ))}
          <text x={g.PAD_L} y={CH + g.PAD_T + 16} textAnchor="middle" fontSize={11} fill="var(--text-dim)">0</text>

          {/* moyenne */}
          {avgY !== null && <line x1={g.PAD_L} y1={avgY} x2={g.VBW - g.PAD_R} y2={avgY} stroke={accent} strokeWidth={1} strokeDasharray="5 4" opacity={0.55} vectorEffect="non-scaling-stroke" />}

          {/* ── représentation : barres (km/tours) ou aire (lissé) ── */}
          {mode === 'smooth'
            ? <SmoothArea data={data} g={g} metric={metric} accent={accent} />
            : (
              <g key={mode + metric} style={{ transformOrigin: 'center bottom', animation: 'thwTaRise .45s cubic-bezier(.22,1,.36,1)' }}>
                {splits.map((sp, i) => {
                  const spd = speedOf(sp, metric)
                  const y = g.yOf(spd), h = Math.max(1.5, g.baseY - y)
                  const w = Math.max(1.5, widths[i] - 1.2)
                  const isHov = hover === i
                  return (
                    <rect key={i} x={xs[i] + 0.6} y={y} width={w} height={h}
                      fill={rampColor(spd, g.minSpeed, g.maxSpeed, ramp)}
                      opacity={hover === null || isHov ? 1 : 0.5}
                      rx={1.5}
                      style={{ transition: 'y .4s cubic-bezier(.22,1,.36,1), height .4s cubic-bezier(.22,1,.36,1), fill .3s ease, opacity .15s' }} />
                  )
                })}
              </g>
            )}

          {/* curseur survol */}
          {mode !== 'smooth' && hover !== null && splits[hover] && (
            <line x1={xs[hover] + widths[hover] / 2} y1={g.PAD_T} x2={xs[hover] + widths[hover] / 2} y2={g.baseY}
              stroke={accent} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.7} />
          )}
          {mode === 'smooth' && smoothT !== null && (() => {
            const x = g.PAD_L + smoothT * g.innerW
            return <line x1={x} y1={g.PAD_T} x2={x} y2={g.baseY} stroke={accent} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.7} />
          })()}

          {/* repères droite : rapide / moyenne / lent (km + lissé) */}
          {showMarkers && avgY !== null && (
            <MarkerTicks data={data} g={g} splits={splits} metric={metric} accent={accent} fastIdx={fastIdx} slowIdx={slowIdx} avgSpeed={avgSpeed} />
          )}
        </svg>

        {/* Tooltips HTML (positionnés en %) */}
        {mode === 'km' && hover !== null && splits[hover] && (
          <TooltipBox xPct={(xs[hover] + widths[hover] / 2) / g.VBW} accent={accent}>
            <KmTooltip sp={splits[hover]} metric={metric} t={t} />
          </TooltipBox>
        )}
        {mode === 'laps' && hover !== null && splits[hover] && (
          <TooltipBox xPct={(xs[hover] + widths[hover] / 2) / g.VBW} accent={accent}>
            <LapTooltip sp={splits[hover]} t={t} />
          </TooltipBox>
        )}
        {mode === 'smooth' && smoothT !== null && (() => {
          const s = sampleAt(data, smoothT)
          if (!s) return null
          return (
            <TooltipBox xPct={(g.PAD_L + smoothT * g.innerW) / g.VBW} accent={accent}>
              <SmoothTooltip s={s} metric={metric} totalDurationS={totalDurationS} t={t} />
            </TooltipBox>
          )
        })()}
      </div>
    </div>
  )
}

// Largeurs de barres : km → ∝ distance ; tours → ∝ durée.
function barWidths(splits: Split[], g: ReturnType<typeof computeGeom>, mode: Mode): number[] {
  const key = mode === 'laps' ? (s: Split) => Math.max(0.1, s.durS) : (s: Split) => Math.max(0.1, s.distM)
  const total = splits.reduce((a, s) => a + key(s), 0) || 1
  return splits.map(s => (key(s) / total) * g.innerW)
}

function SmoothArea({ data, g, metric, accent }: { data: AData; g: ReturnType<typeof computeGeom>; metric: Metric; accent: string }) {
  const pts = data.smooth.filter(s => smoothSpeed(s, metric) > 0)
  if (pts.length < 2) return null
  let line = ''
  pts.forEach((s, i) => { line += `${i === 0 ? 'M' : 'L'} ${g.xOf(s.dist).toFixed(1)} ${g.yOf(smoothSpeed(s, metric)).toFixed(1)} ` })
  const area = `M ${g.xOf(pts[0].dist).toFixed(1)} ${g.baseY} ` +
    pts.map(s => `L ${g.xOf(s.dist).toFixed(1)} ${g.yOf(smoothSpeed(s, metric)).toFixed(1)}`).join(' ') +
    ` L ${g.xOf(pts[pts.length - 1].dist).toFixed(1)} ${g.baseY} Z`
  return (
    <g key={'sm' + metric} style={{ animation: 'thwTaRise .45s cubic-bezier(.22,1,.36,1)' }}>
      <path d={area} fill={accent} opacity={0.12} stroke="none" />
      <path d={line} fill="none" stroke={accent} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  )
}

function MarkerTicks({ data, g, splits, metric, accent, fastIdx, slowIdx, avgSpeed }: {
  data: AData; g: ReturnType<typeof computeGeom>; splits: Split[]; metric: Metric
  accent: string; fastIdx: number; slowIdx: number; avgSpeed: number
}) {
  void data
  const x = g.VBW - g.PAD_R
  const fast = splits[fastIdx], slow = splits[slowIdx]
  const rows: { y: number; val: string; c: string }[] = []
  if (fast) rows.push({ y: g.yOf(speedOf(fast, metric)), val: paceStr(speedOf(fast, metric)), c: accent })
  rows.push({ y: g.yOf(avgSpeed), val: paceStr(avgSpeed), c: 'var(--text-mid)' })
  if (slow) rows.push({ y: g.yOf(speedOf(slow, metric)), val: paceStr(speedOf(slow, metric)), c: 'var(--text-dim)' })
  return (
    <g>
      {rows.map((r, i) => (
        <g key={i}>
          <line x1={x - 5} y1={r.y} x2={x + 3} y2={r.y} stroke={r.c} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          <text x={x + 6} y={r.y + 3.5} textAnchor="start" fontSize={10.5} fontWeight={700} fill={r.c} style={{ fontVariantNumeric: 'tabular-nums' }}>{r.val}</text>
        </g>
      ))}
    </g>
  )
}

function sampleAt(data: AData, ratio: number): SmoothSample | null {
  if (!data.smooth.length) return null
  const targetDist = ratio * data.totalDist
  let best = data.smooth[0], bestD = Infinity
  for (const s of data.smooth) { const d = Math.abs(s.dist - targetDist); if (d < bestD) { bestD = d; best = s } }
  return best
}

// ── Tooltips ────────────────────────────────────────────────────────────
function TooltipBox({ xPct, accent, children }: { xPct: number; accent: string; children: ReactNode }) {
  const leftPct = Math.max(6, Math.min(94, xPct * 100))
  const flip = leftPct > 62
  return (
    <div style={{
      position: 'absolute', top: 6, left: `${leftPct}%`,
      transform: `translateX(${flip ? '-100%' : '0'}) translateX(${flip ? -8 : 8}px)`,
      background: 'var(--bg-card)', border: `1px solid ${accent}44`, borderRadius: 9,
      boxShadow: '0 6px 22px rgba(0,0,0,0.14)', padding: '9px 11px', pointerEvents: 'none',
      zIndex: 5, minWidth: 128, fontSize: 12,
    }}>{children}</div>
  )
}
function TT({ l, v, c }: { l: string; v: string; c?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '1.5px 0' }}>
      <span style={{ color: 'var(--text-dim)' }}>{l}</span>
      <span style={{ color: c ?? 'var(--text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  )
}
function KmTooltip({ sp, metric, t }: { sp: Split; metric: Metric; t: (k: string) => string }) {
  void metric
  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('actp.km_label')} {sp.label}</div>
      <TT l={t('actp.pace')} v={`${paceStr(sp.speedMs)}/km`} />
      <TT l="VAP" v={`${paceStr(sp.vapMs)}/km`} />
      <TT l={t('actp.hr_short')} v={sp.avgHr != null ? `${Math.round(sp.avgHr)} bpm` : '—'} />
      <TT l="D+" v={`${Math.round(sp.dPlus)} m`} />
      <TT l="Zone" v={sp.zone != null ? `Z${sp.zone + 1}` : '—'} c="var(--primary)" />
    </>
  )
}
function LapTooltip({ sp, t }: { sp: Split; t: (k: string) => string }) {
  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('actp.lap_label')} {sp.label}</div>
      <TT l={t('actp.duration')} v={fmtDurShort(sp.durS)} />
      <TT l={t('actp.distance')} v={fmtDistKm(sp.distM)} />
      <TT l={t('actp.pace')} v={`${paceStr(sp.speedMs)}/km`} />
      <TT l={t('actp.hr_short')} v={sp.avgHr != null ? `${Math.round(sp.avgHr)} bpm` : '—'} />
      <TT l="D+" v={`${Math.round(sp.dPlus)} m`} />
    </>
  )
}
function SmoothTooltip({ s, metric, totalDurationS, t }: { s: SmoothSample; metric: Metric; totalDurationS: number | null; t: (k: string) => string }) {
  void totalDurationS
  return (
    <>
      <TT l={t('actp.time')} v={fmtDurShort(s.time)} />
      <TT l={t('actp.pace')} v={`${paceStr(smoothSpeed(s, metric))}/km`} />
      <TT l={t('actp.distance')} v={fmtDistKm(s.dist)} />
      <TT l={t('actp.altitude')} v={`${Math.round(s.alt)} m`} />
      <TT l="D+" v={`${Math.round(s.dPlusCum)} m`} />
    </>
  )
}

// ══════════════════════════════════════════════════════════════════
// TABLEAU statique
// ══════════════════════════════════════════════════════════════════
function AnalysisTable({ splits, mode, t }: { splits: Split[]; mode: Mode; t: (k: string) => string }) {
  const isLaps = mode === 'laps'
  if (!splits.length) return null
  const cols = isLaps
    ? [isLaps ? t('actp.lap_col') : 'Km', t('actp.time'), t('actp.pace'), 'VAP', 'D+', t('actp.hr_short'), t('actp.temp_short')]
    : ['Km', t('actp.pace'), 'VAP', 'D+', t('actp.hr_short'), t('actp.temp_short')]
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionTitle text={t('actp.precise_data')} />
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card2)' }}>
              {cols.map(c => (
                <th key={c} style={{ padding: '8px 12px', textAlign: c === (isLaps ? t('actp.lap_col') : 'Km') ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {splits.map((sp, i) => (
              <tr key={i} style={{ background: i % 2 ? 'var(--bg-card2)' : 'transparent' }}>
                <td style={{ padding: '7px 12px', color: 'var(--text-dim)', fontWeight: 700, whiteSpace: 'nowrap' }}>{sp.label}</td>
                {isLaps && <td style={tdR}>{fmtDurShort(sp.durS)}</td>}
                <td style={tdR}>{paceStr(sp.speedMs)}/km</td>
                <td style={{ ...tdR, color: 'var(--primary)' }}>{paceStr(sp.vapMs)}/km</td>
                <td style={tdR}>{Math.round(sp.dPlus)} m</td>
                <td style={tdR}>{sp.avgHr != null ? `${Math.round(sp.avgHr)}` : '—'}</td>
                <td style={tdR}>{sp.avgTemp != null ? `${Math.round(sp.avgTemp)}°` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
const tdR: React.CSSProperties = { padding: '7px 12px', textAlign: 'right', color: 'var(--text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

// ══════════════════════════════════════════════════════════════════
// JAUGES en grand (barres cliquables → modal), ligne en mode lissé
// ══════════════════════════════════════════════════════════════════
function AnalysisGauges({ data, splits, mode, metric, accent, ramp, onTap, t }: {
  data: AData; splits: Split[]; mode: Mode; metric: Metric
  accent: string; ramp: readonly string[]; onTap?: (sp: Split) => void; t: (k: string) => string
}) {
  const CH = 220
  const g = computeGeom(data, splits, metric, CH)
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const widths = barWidths(splits, g, mode)
  const xs: number[] = []
  { let c = g.PAD_L; for (let i = 0; i < splits.length; i++) { xs.push(c); c += widths[i] } }

  function idxAt(clientX: number): number {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return -1
    const xVB = ((clientX - rect.left) / rect.width) * g.VBW
    let acc = g.PAD_L
    for (let i = 0; i < splits.length; i++) { if (xVB >= acc && xVB < acc + widths[i]) return i; acc += widths[i] }
    return -1
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <SectionTitle text={mode === 'laps' ? t('actp.laps_upper') : t('actp.splits_upper')} />
      <div
        ref={wrapRef}
        onMouseMove={e => setHover(idxAt(e.clientX))}
        onMouseLeave={() => setHover(null)}
        onClick={e => { if (mode !== 'smooth' && onTap) { const i = idxAt(e.clientX); if (i >= 0) onTap(splits[i]) } }}
        style={{ position: 'relative', width: '100%', paddingBottom: `${((CH + g.PAD_T + g.PAD_B) / g.VBW) * 100}%`, cursor: mode !== 'smooth' && onTap ? 'pointer' : 'crosshair' }}
      >
        <svg viewBox={`0 0 ${g.VBW} ${CH + g.PAD_T + g.PAD_B}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          {data.hasAlt && <path d={altitudePath(data, g)} fill="var(--border)" opacity={0.4} stroke="none" />}
          {yPaceTicks(g).map((m, i) => (
            <g key={'yp' + i}>
              <line x1={g.PAD_L} y1={m.y} x2={g.VBW - g.PAD_R} y2={m.y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
              <text x={g.PAD_L - 5} y={m.y + 3} textAnchor="end" fontSize={10} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.label}</text>
            </g>
          ))}
          {xAxisTicks(data, g).map((m, i) => (
            <text key={'x' + i} x={m.x} y={CH + g.PAD_T + 15} textAnchor="middle" fontSize={10} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.label}</text>
          ))}

          {mode === 'smooth'
            ? <SmoothArea data={data} g={g} metric={metric} accent={accent} />
            : (
              <g key={mode + metric} style={{ transformOrigin: 'center bottom', animation: 'thwTaRise .45s cubic-bezier(.22,1,.36,1)' }}>
                {splits.map((sp, i) => {
                  const spd = speedOf(sp, metric)
                  const y = g.yOf(spd), h = Math.max(2, g.baseY - y)
                  const w = Math.max(2, widths[i] - 1.4)
                  const isHov = hover === i
                  return (
                    <g key={i}>
                      <rect x={xs[i] + 0.7} y={y} width={w} height={h}
                        fill={rampColor(spd, g.minSpeed, g.maxSpeed, ramp)}
                        opacity={hover === null || isHov ? 1 : 0.55} rx={2}
                        style={{ transition: 'y .4s cubic-bezier(.22,1,.36,1), height .4s cubic-bezier(.22,1,.36,1), fill .3s ease, opacity .15s' }} />
                      {w >= 16 && h >= 16 && (
                        <text x={xs[i] + widths[i] / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill={accent}
                          style={{ fontVariantNumeric: 'tabular-nums' }}>{paceStr(spd)}</text>
                      )}
                      <text x={xs[i] + widths[i] / 2} y={CH + g.PAD_T + 15} textAnchor="middle" fontSize={10} fill="var(--text-dim)"
                        style={{ fontVariantNumeric: 'tabular-nums', opacity: (i === 0 || (i + 1) % Math.max(1, Math.ceil(splits.length / 14)) === 0) ? 1 : 0 }}>{sp.label}</text>
                    </g>
                  )
                })}
              </g>
            )}
        </svg>
        {mode !== 'smooth' && hover !== null && splits[hover] && (
          <TooltipBox xPct={(xs[hover] + widths[hover] / 2) / g.VBW} accent={accent}>
            {mode === 'laps' ? <LapTooltip sp={splits[hover]} t={t} /> : <KmTooltip sp={splits[hover]} metric={metric} t={t} />}
          </TooltipBox>
        )}
      </div>
      {mode !== 'smooth' && onTap && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{t('actp.tap_gauge_hint')}</div>
      )}
    </div>
  )
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>{text}</div>
  )
}
