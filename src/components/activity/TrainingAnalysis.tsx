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
type Metric = 'pace' | 'vap'   // run : allure / VAP ; vélo : watts / watts normalisés
type Sport  = 'run' | 'bike'

interface Split {
  label:     string    // "1", "2"…
  distM:     number
  durS:      number
  startDist: number
  endDist:   number
  spanM:     number    // distance « théorique » du segment (km rond) pour l'affichage
  sampleStart: number  // index d'échantillon (pour ouvrir le détail du segment)
  sampleEnd: number
  speedMs:   number    // vitesse plate moyenne (allure)
  vapMs:     number    // vitesse ajustée pente moyenne (VAP)
  watts:     number    // puissance moyenne (vélo)
  normWatts: number    // puissance normalisée (vélo)
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
  watts:    number
  alt:      number
  time:     number
  dPlusCum: number
}

// ── Palettes d'intensité (rapide = foncé). Allure=bleu, VAP=violet ──────
const PACE_BLUE   = ['#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'] as const
const VAP_VIOLET  = ['#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'] as const
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

// Moyenne mobile (fenêtre ±half) ignorant les valeurs <= minVal (arrêts).
// Reporte la dernière valeur valide quand la fenêtre est vide → courbe continue.
function movingAvgIgnore(arr: number[], half: number, minVal: number): number[] {
  const n = arr.length
  const out = new Array<number>(n)
  let last = 0
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0
    const a = Math.max(0, i - half), b = Math.min(n - 1, i + half)
    for (let j = a; j <= b; j++) { const v = arr[j]; if (v > minVal) { s += v; c++ } }
    out[i] = c ? s / c : last
    if (c) last = out[i]
  }
  return out
}

// ── Calcul de tout le jeu de données depuis les streams + laps ──────────
const BIKE_SPLIT_SECONDS = 1800   // vélo : « temps intermédiaires » toutes les 30 min

function useAnalysisData(streams: StreamData | null, laps: LapData[], zones: PaceZone[] | null | undefined, sport: Sport) {
  return useMemo(() => {
    const velocity = streams?.velocity ?? null
    const altitude = streams?.altitude ?? null
    const hr       = streams?.heartrate ?? null
    const temp     = streams?.temp ?? null
    const time     = streams?.time ?? null
    const watts    = streams?.watts ?? null
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

    // ── Splits « intermédiaires » : par km (course) ou par 30 min (vélo) ──
    const kmSplits: Split[] = []
    if (sport === 'bike' && time && time.length === N) {
      const t0 = time[0] ?? 0
      const totalT = (time[N - 1] ?? 0) - t0
      const nSeg = Math.max(1, Math.ceil(totalT / BIKE_SPLIT_SECONDS))
      for (let k = 0; k < nSeg; k++) {
        const tStart = t0 + k * BIKE_SPLIT_SECONDS
        const tEnd = t0 + Math.min((k + 1) * BIKE_SPLIT_SECONDS, totalT)
        let i0 = 0, i1 = N - 1
        for (let i = 0; i < N; i++) { if ((time[i] ?? 0) >= tStart) { i0 = i; break } }
        for (let i = i0; i < N; i++) { if ((time[i] ?? 0) >= tEnd) { i1 = i; break }; i1 = i }
        kmSplits.push(buildSplit(String(k + 1), i0, i1, dist, velocity, vapKmh, watts, alt, hr, temp, dtAt, zones, laps))
      }
    } else {
      const nKm = Math.max(1, Math.ceil(totalDist / 1000))
      for (let k = 0; k < nKm; k++) {
        const dStart = k * 1000
        const dEnd = Math.min((k + 1) * 1000, totalDist)
        let i0 = 0, i1 = N - 1
        for (let i = 0; i < N; i++) { if (dist[i] >= dStart) { i0 = i; break } }
        for (let i = i0; i < N; i++) { if (dist[i] >= dEnd) { i1 = i; break }; i1 = i }
        kmSplits.push(buildSplit(String(k + 1), i0, i1, dist, velocity, vapKmh, watts, alt, hr, temp, dtAt, zones, laps, dEnd - dStart))
      }
    }

    // ── Splits par tour ──────────────────────────────────────────────
    const lapSplits: Split[] = laps.map((lap, li) => {
      const i0 = lap.start_index ?? 0
      const i1 = lap.end_index ?? (li < laps.length - 1 ? (laps[li + 1].start_index ?? N - 1) : N - 1)
      const sp = buildSplit(String(li + 1), Math.min(i0, N - 1), Math.min(i1, N - 1), dist, velocity, vapKmh, watts, alt, hr, temp, dtAt, zones, laps)
      // Préfère les valeurs officielles du tour quand présentes.
      if (lap.avg_speed_ms && lap.avg_speed_ms > 0) sp.speedMs = lap.avg_speed_ms
      else if (lap.distance_m > 0 && lap.moving_time_s > 0) sp.speedMs = lap.distance_m / lap.moving_time_s
      if (lap.moving_time_s > 0) sp.durS = lap.moving_time_s
      if (lap.distance_m > 0) { sp.distM = lap.distance_m; sp.spanM = lap.distance_m }
      if (lap.avg_hr != null) sp.avgHr = lap.avg_hr
      if (lap.avg_watts != null) sp.watts = lap.avg_watts
      if (lap.elevation_gain_m != null) sp.dPlus = lap.elevation_gain_m
      sp.zone = zoneIndex(sp.speedMs, zones)
      sp.lapIndex = li
      return sp
    })

    // ── Échantillons lissés (≈240 pts) pour la ligne + le profil ─────
    // Lissage type Strava : moyenne mobile de la vitesse (et de la VAP), en
    // ignorant les valeurs nulles/arrêts (sinon pics d'allure aberrants).
    const W = Math.max(10, Math.min(45, Math.round(N / 120)))
    const velSmooth = movingAvgIgnore(velocity, W, 0.3)
    const vapSmooth = movingAvgIgnore(vapKmh, W, 1)
    const wattSmooth = watts ? movingAvgIgnore(watts, W, 0) : null
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
        speedMs: velSmooth[i] > 0 ? velSmooth[i] : 0,
        vapMs: (vapSmooth[i] ?? 0) / 3.6,
        watts: wattSmooth ? Math.max(0, wattSmooth[i]) : 0,
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
    const movingW = watts ? watts.filter(w => w > 0) : []
    const avgWatts = movingW.length ? movingW.reduce((a, b) => a + b, 0) / movingW.length : 0
    const avgNorm = watts ? (computeNp(watts) || avgWatts) : 0

    const hasAlt = !!alt

    return {
      kmSplits, lapSplits, smooth, totalDist,
      avgSpeed, avgVap, avgWatts, avgNorm, hasAlt,
      altMin: alt ? Math.min(...alt) : 0,
      altMax: alt ? Math.max(...alt) : 0,
    }
  }, [streams, laps, zones, sport])
}

// Puissance normalisée (NP) sur une tranche : rolling 30 s, moyenne des ^4, ^0,25.
function computeNp(w: number[]): number {
  const nz = w.filter(x => x > 0)
  if (w.length < 30) return nz.length ? nz.reduce((a, b) => a + b, 0) / nz.length : 0
  const roll: number[] = []
  for (let i = 29; i < w.length; i++) { let s = 0; for (let j = i - 29; j <= i; j++) s += w[j]; roll.push(s / 30) }
  if (!roll.length) return nz.length ? nz.reduce((a, b) => a + b, 0) / nz.length : 0
  const m4 = roll.reduce((a, b) => a + Math.pow(b, 4), 0) / roll.length
  return Math.pow(m4, 0.25)
}

function buildSplit(
  label: string, i0: number, i1: number,
  dist: number[], velocity: number[], vapKmh: number[], watts: number[] | null,
  alt: number[] | null, hr: number[] | null, temp: number[] | null,
  dtAt: (i: number) => number, zones: PaceZone[] | null | undefined, laps: LapData[], spanM?: number,
): Split {
  void velocity
  const a = Math.max(0, Math.min(i0, i1)), b = Math.max(i0, i1)
  const distM = Math.max(0, (dist[b] ?? 0) - (dist[a] ?? 0))
  let durS = 0
  for (let i = a + 1; i <= b; i++) durS += dtAt(i)
  const speedMs = durS > 0 ? distM / durS : 0
  // VAP moyenne : vitesse ajustée moyenne sur le segment (m/s)
  let vSum = 0, vN = 0
  for (let i = a; i <= b; i++) { const v = vapKmh[i]; if (v > 1) { vSum += v; vN++ } }
  const vapMs = vN ? (vSum / vN) / 3.6 : speedMs
  // Watts moyen + normalisé
  let wSum = 0, wN = 0; const wSlice: number[] = []
  if (watts) for (let i = a; i <= b; i++) { const w = watts[i]; if (w != null) { wSlice.push(w); if (w > 0) { wSum += w; wN++ } } }
  const wattsAvg = wN ? wSum / wN : 0
  const normWatts = watts ? (computeNp(wSlice) || wattsAvg) : 0
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
    spanM: spanM ?? distM, sampleStart: a, sampleEnd: b,
    speedMs, vapMs, watts: wattsAvg, normWatts, dPlus, avgHr, avgTemp,
    zone: zoneIndex(speedMs, zones), lapIndex,
  }
}

// ══════════════════════════════════════════════════════════════════
// Composant principal
// ══════════════════════════════════════════════════════════════════
export interface SegmentTapInfo {
  label: string; startIndex: number; endIndex: number
  distanceM: number; durationS: number
  avgHr: number | null; avgSpeedMs: number; avgWatts: number; dPlus: number
}

interface Props {
  streams:        StreamData | null
  laps:           LapData[] | null
  activityId:     string
  totalDurationS: number | null
  sport?:         Sport
  paceZones?:     PaceZone[] | null
  onLapTap?:      (lapIndex: number) => void
  onSegmentTap?:  (seg: SegmentTapInfo) => void     // clic sur un segment km / 30 min → détail du segment
  onHoverRatio?:  (ratio: number | null) => void   // 0..1 le long de l'activité → point rouge carte
  onHoverSegment?: (seg: { start: number; end: number } | null) => void // survol → segment rouge sur la carte
  kpiNode?:       ReactNode
  mapNode?:       ReactNode
  feelingNode?:   ReactNode
}

export function TrainingAnalysis({ streams, laps: lapsProp, activityId, totalDurationS, sport = 'run', paceZones, onLapTap, onSegmentTap, onHoverRatio, onHoverSegment, kpiNode, mapNode, feelingNode }: Props) {
  const { t } = useI18n()
  const [mode, setMode]     = useState<Mode>('km')
  const [metric, setMetric] = useState<Metric>('pace')
  const [hovered, setHovered] = useState<number | null>(null)

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

  const data = useAnalysisData(streams, laps, paceZones, sport)

  const splits = mode === 'laps' ? (data?.lapSplits ?? []) : (data?.kmSplits ?? [])

  if (!data || (data.kmSplits.length === 0 && !hasLaps)) {
    return (kpiNode || mapNode) ? (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20, alignItems: 'start' }}>
        <div>{kpiNode}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{mapNode}{feelingNode}</div>
      </div>
    ) : null
  }

  const accent = metric === 'pace' ? ACCENT_PACE : ACCENT_VAP
  const ramp   = metric === 'pace' ? PACE_BLUE : VAP_VIOLET

  const ratioOf = (i: number): number => {
    const sp = splits[i]
    if (!sp || data.totalDist <= 0) return 0
    return Math.max(0, Math.min(1, ((sp.startDist + sp.endDist) / 2) / data.totalDist))
  }
  // Survol → segment [start,end] (0..1) pour surligner la carte en rouge.
  const segOf = (i: number): { start: number; end: number } | null => {
    const sp = splits[i]
    if (!sp || data.totalDist <= 0) return null
    return { start: sp.startDist / data.totalDist, end: sp.endDist / data.totalDist }
  }
  // Clic : mode Tours → détail du tour ; mode km/30 min → détail du segment.
  const onTap = (sp: Split) => {
    if (mode === 'laps' && hasLaps && onLapTap) onLapTap(sp.lapIndex)
    else if (onSegmentTap) onSegmentTap({
      label: sp.label, startIndex: sp.sampleStart, endIndex: sp.sampleEnd,
      distanceM: sp.spanM, durationS: sp.durS,
      avgHr: sp.avgHr, avgSpeedMs: sp.speedMs, avgWatts: sp.watts, dPlus: sp.dPlus,
    })
  }
  const tapEnabled = (mode === 'laps' && hasLaps && !!onLapTap) || (mode !== 'laps' && !!onSegmentTap)
  const onTapProp = tapEnabled ? onTap : undefined

  return (
    <div>
      <style>{`
        @keyframes thwTaRise { from { opacity: 0; transform: translateY(6px) scaleY(0.92); } to { opacity: 1; transform: none; } }
        @media (max-width: 1099px){ .thw-ta-top { grid-template-columns: 1fr !important; } .thw-ta-rt { grid-template-columns: 1fr !important; } }
      `}</style>

      <div className="thw-ta-top" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start' }}>
        {/* GAUCHE : données → ressenti/difficulté → LE graphique + boutons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {kpiNode}
          {feelingNode}
          <AnalysisGraph data={data} splits={splits} mode={mode} metric={metric} sport={sport} accent={accent} ramp={ramp} totalDurationS={totalDurationS}
            onTap={onTapProp} hovered={hovered} setHovered={setHovered} onHoverRatio={onHoverRatio} onHoverSegment={onHoverSegment} ratioOf={ratioOf} segOf={segOf} t={t} />
          <AnalysisControls mode={mode} metric={metric} sport={sport} hasLaps={hasLaps} onMode={setMode} onMetric={setMetric} t={t} />
        </div>
        {/* DROITE : tableau | carte (à droite) côte à côte */}
        <div className="thw-ta-rt" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(220px, 1fr)', gap: 16, alignItems: 'start', minWidth: 0 }}>
          <AnalysisTable splits={splits} mode={mode} sport={sport} hovered={hovered} setHovered={setHovered} onTap={onTapProp} onHoverRatio={onHoverRatio} onHoverSegment={onHoverSegment} ratioOf={ratioOf} segOf={segOf} t={t} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {mapNode}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 5 boutons ───────────────────────────────────────────────────────────
function AnalysisControls({ mode, metric, sport, hasLaps, onMode, onMetric, t }: {
  mode: Mode; metric: Metric; sport: Sport; hasLaps: boolean
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
    { k: 'km',     label: sport === 'bike' ? t('actp.splits_time_bike') : t('actp.splits_time') },
    ...(hasLaps ? [{ k: 'laps' as Mode, label: t('actp.laps') }] : []),
    { k: 'smooth', label: t('actp.smoothed') },
  ]
  const m1 = sport === 'bike' ? t('actp.watts') : t('actp.pace')
  const m2 = sport === 'bike' ? t('actp.norm_watts') : 'VAP'
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {modes.map(m => <button key={m.k} onClick={() => onMode(m.k)} style={seg(mode === m.k)}>{m.label}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onMetric('pace')} style={seg(metric === 'pace')}>{m1}</button>
        <button onClick={() => onMetric('vap')} style={seg(metric === 'vap')}>{m2}</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// COURBE — profil altimétrique (gris) + barres/ligne d'allure
// ══════════════════════════════════════════════════════════════════
type AData = NonNullable<ReturnType<typeof useAnalysisData>>

// Valeur tracée : course → vitesse (allure/VAP) ; vélo → puissance (watts/NP).
function speedOf(sp: Split, metric: Metric, sport: Sport): number {
  if (sport === 'bike') return metric === 'pace' ? sp.watts : sp.normWatts
  return metric === 'pace' ? sp.speedMs : sp.vapMs
}
function smoothSpeed(s: SmoothSample, metric: Metric, sport: Sport): number {
  if (sport === 'bike') return s.watts
  return metric === 'pace' ? s.speedMs : s.vapMs
}
// Formatage d'une valeur tracée en libellé (allure "/km" ou puissance "W").
function valStr(v: number, sport: Sport): string {
  return sport === 'bike' ? `${Math.round(v)} W` : `${paceStr(v)}/km`
}

// Géométrie partagée courbe / jauges.
function computeGeom(data: AData, splits: Split[], metric: Metric, sport: Sport, chartH: number, vbw = 1000) {
  const VBW = vbw, PAD_L = 46, PAD_R = 64, PAD_T = 16, PAD_B = 24
  const innerW = VBW - PAD_L - PAD_R
  const baseY = PAD_T + chartH
  const speeds = splits.map(s => speedOf(s, metric, sport)).filter(s => s > 0)
  const smoothSpeeds = data.smooth.map(s => smoothSpeed(s, metric, sport)).filter(s => s > 0)
  const allSpeeds = speeds.concat(smoothSpeeds)
  const maxSpeed = allSpeeds.length ? Math.max(...allSpeeds) : 1
  const minSpeed = allSpeeds.length ? Math.min(...allSpeeds) : 0

  let yOf: (v: number) => number
  const yTicks: { y: number; label: string }[] = []
  if (sport === 'bike') {
    // ── Échelle Y en WATTS → lignes rondes, forte puissance en haut ──
    const maxY = (maxSpeed * 1.08) || 1
    yOf = (w: number) => w > 0 ? PAD_T + chartH - (Math.min(w, maxY) / maxY) * chartH : baseY
    const step = Math.max(25, Math.ceil((maxY / 6) / 25) * 25)
    for (let w = step; w <= maxY; w += step) yTicks.push({ y: yOf(w), label: `${w} W` })
  } else {
    // ── Échelle Y en ALLURE (min/km) → lignes rondes (8:00 … 2:00) ──
    const fastestPace = maxSpeed > 0 ? 1000 / maxSpeed / 60 : 6
    const slowestPace = minSpeed > 0 ? 1000 / minSpeed / 60 : 8
    const paceTop = Math.max(2, Math.floor(fastestPace))
    let paceBottom = Math.min(9, Math.max(paceTop + 3, Math.ceil(slowestPace)))
    if (paceBottom - paceTop < 3) paceBottom = paceTop + 3
    const paceSpan = paceBottom - paceTop || 1
    const yOfPace = (p: number) => PAD_T + ((Math.max(paceTop, Math.min(paceBottom, p)) - paceTop) / paceSpan) * chartH
    yOf = (sp: number) => sp > 0 ? yOfPace(1000 / sp / 60) : baseY
    for (let m = paceTop; m <= paceBottom; m++) yTicks.push({ y: yOfPace(m), label: `${m}:00` })
  }

  const xOf = (dist: number) => PAD_L + (data.totalDist > 0 ? dist / data.totalDist : 0) * innerW
  // Altitude compressée sur la bande basse (50 % → base).
  const altTop = PAD_T + chartH * 0.5
  const altSpan = Math.max(1, data.altMax - data.altMin)
  const altYOf = (alt: number) => baseY - ((alt - data.altMin) / altSpan) * (baseY - altTop)
  return { VBW, PAD_L, PAD_R, PAD_T, PAD_B, innerW, baseY, chartH, maxSpeed, minSpeed, yTicks, yOf, xOf, altTop, altSpan, altYOf }
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

// Largeurs de barres : course km → ∝ distance ; tours & vélo → ∝ durée.
function barWidths(splits: Split[], g: ReturnType<typeof computeGeom>, mode: Mode, sport: Sport): number[] {
  const byTime = mode === 'laps' || sport === 'bike'
  const key = byTime ? (s: Split) => Math.max(0.1, s.durS) : (s: Split) => Math.max(0.1, s.distM)
  const total = splits.reduce((a, s) => a + key(s), 0) || 1
  return splits.map(s => (key(s) / total) * g.innerW)
}

function SmoothArea({ data, g, metric, sport, accent }: { data: AData; g: ReturnType<typeof computeGeom>; metric: Metric; sport: Sport; accent: string }) {
  const pts = data.smooth.filter(s => smoothSpeed(s, metric, sport) > 0)
  if (pts.length < 2) return null
  let line = ''
  pts.forEach((s, i) => { line += `${i === 0 ? 'M' : 'L'} ${g.xOf(s.dist).toFixed(1)} ${g.yOf(smoothSpeed(s, metric, sport)).toFixed(1)} ` })
  const area = `M ${g.xOf(pts[0].dist).toFixed(1)} ${g.baseY} ` +
    pts.map(s => `L ${g.xOf(s.dist).toFixed(1)} ${g.yOf(smoothSpeed(s, metric, sport)).toFixed(1)}`).join(' ') +
    ` L ${g.xOf(pts[pts.length - 1].dist).toFixed(1)} ${g.baseY} Z`
  return (
    <g key={'sm' + metric} style={{ animation: 'thwTaRise .45s cubic-bezier(.22,1,.36,1)' }}>
      <path d={area} fill={accent} opacity={0.12} stroke="none" />
      <path d={line} fill="none" stroke={accent} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  )
}

function MarkerTicks({ data, g, splits, metric, sport, accent, fastIdx, slowIdx, avgSpeed, t }: {
  data: AData; g: ReturnType<typeof computeGeom>; splits: Split[]; metric: Metric; sport: Sport
  accent: string; fastIdx: number; slowIdx: number; avgSpeed: number; t: (k: string) => string
}) {
  void data
  const x = g.VBW - g.PAD_R
  const fast = splits[fastIdx], slow = splits[slowIdx]
  const fastLabel = sport === 'bike' ? t('actp.strongest') : t('actp.fastest_km')
  const slowLabel = sport === 'bike' ? t('actp.weakest') : t('actp.slowest_km')
  const rows: { y: number; val: string; label: string; c: string }[] = []
  if (fast) rows.push({ y: g.yOf(speedOf(fast, metric, sport)), val: valStr(speedOf(fast, metric, sport), sport), label: fastLabel, c: accent })
  rows.push({ y: g.yOf(avgSpeed), val: valStr(avgSpeed, sport), label: t('actp.average_short'), c: 'var(--text-mid)' })
  if (slow) rows.push({ y: g.yOf(speedOf(slow, metric, sport)), val: valStr(speedOf(slow, metric, sport), sport), label: slowLabel, c: 'var(--text-dim)' })
  return (
    <g>
      {rows.map((r, i) => (
        <g key={i}>
          <line x1={x - 6} y1={r.y} x2={x + 4} y2={r.y} stroke={r.c} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          <text x={x + 7} y={r.y - 1.5} textAnchor="start" fontSize={7} fontWeight={600} fill="var(--text-dim)">{r.label}</text>
          <text x={x + 7} y={r.y + 8} textAnchor="start" fontSize={10.5} fontWeight={700} fill={r.c} style={{ fontVariantNumeric: 'tabular-nums' }}>{r.val}</text>
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
function KmTooltip({ sp, sport, t }: { sp: Split; sport: Sport; t: (k: string) => string }) {
  const label = sport === 'bike' ? t('actp.splits_seg_label') : t('actp.km_label')
  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label} {sp.label}</div>
      {sport === 'bike' ? (
        <>
          <TT l={t('actp.watts')} v={`${Math.round(sp.watts)} W`} />
          <TT l={t('actp.norm_watts')} v={`${Math.round(sp.normWatts)} W`} />
          <TT l={t('actp.hr_short')} v={sp.avgHr != null ? `${Math.round(sp.avgHr)} bpm` : '—'} />
          <TT l="D+" v={`${Math.round(sp.dPlus)} m`} />
        </>
      ) : (
        <>
          <TT l={t('actp.pace')} v={`${paceStr(sp.speedMs)}/km`} />
          <TT l="VAP" v={`${paceStr(sp.vapMs)}/km`} />
          <TT l={t('actp.hr_short')} v={sp.avgHr != null ? `${Math.round(sp.avgHr)} bpm` : '—'} />
          <TT l="D+" v={`${Math.round(sp.dPlus)} m`} />
          <TT l="Zone" v={sp.zone != null ? `Z${sp.zone + 1}` : '—'} c="var(--primary)" />
        </>
      )}
    </>
  )
}
function LapTooltip({ sp, sport, t }: { sp: Split; sport: Sport; t: (k: string) => string }) {
  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{t('actp.lap_label')} {sp.label}</div>
      <TT l={t('actp.duration')} v={fmtDurShort(sp.durS)} />
      <TT l={t('actp.distance')} v={fmtDistKm(sp.distM)} />
      {sport === 'bike'
        ? <TT l={t('actp.watts')} v={`${Math.round(sp.watts)} W`} />
        : <TT l={t('actp.pace')} v={`${paceStr(sp.speedMs)}/km`} />}
      <TT l={t('actp.hr_short')} v={sp.avgHr != null ? `${Math.round(sp.avgHr)} bpm` : '—'} />
      <TT l="D+" v={`${Math.round(sp.dPlus)} m`} />
    </>
  )
}
function SmoothTooltip({ s, metric, sport, totalDurationS, t }: { s: SmoothSample; metric: Metric; sport: Sport; totalDurationS: number | null; t: (k: string) => string }) {
  void totalDurationS
  return (
    <>
      <TT l={t('actp.time')} v={fmtDurShort(s.time)} />
      {sport === 'bike'
        ? <TT l={t('actp.watts')} v={`${Math.round(smoothSpeed(s, metric, sport))} W`} />
        : <TT l={t('actp.pace')} v={`${paceStr(smoothSpeed(s, metric, sport))}/km`} />}
      <TT l={t('actp.distance')} v={fmtDistKm(s.dist)} />
      <TT l={t('actp.altitude')} v={`${Math.round(s.alt)} m`} />
      <TT l="D+" v={`${Math.round(s.dPlusCum)} m`} />
    </>
  )
}

// ══════════════════════════════════════════════════════════════════
// TABLEAU statique
// ══════════════════════════════════════════════════════════════════
function AnalysisTable({ splits, mode, sport, hovered, setHovered, onTap, onHoverRatio, onHoverSegment, ratioOf, segOf, t }: {
  splits: Split[]; mode: Mode; sport: Sport
  hovered: number | null; setHovered: (i: number | null) => void
  onTap?: (sp: Split) => void
  onHoverRatio?: (r: number | null) => void; onHoverSegment?: (s: { start: number; end: number } | null) => void
  ratioOf: (i: number) => number; segOf: (i: number) => { start: number; end: number } | null
  t: (k: string) => string
}) {
  const isLaps = mode === 'laps'
  const isBike = sport === 'bike'
  if (!splits.length) return null
  const firstCol = isLaps ? t('actp.lap_col') : (isBike ? t('actp.seg_col') : 'Km')
  const cols = isBike
    ? [firstCol, t('actp.watts'), t('actp.norm_watts'), 'D+', t('actp.hr_short'), t('actp.temp_short')]
    : [firstCol, t('actp.pace'), 'VAP', 'D+', t('actp.hr_short'), t('actp.temp_short')]
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionTitle text={t('actp.precise_data')} />
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card2)' }}>
              {cols.map((c, ci) => (
                <th key={c} style={{ padding: '8px 12px', textAlign: ci === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {splits.map((sp, i) => {
              const isHov = hovered === i
              return (
                <tr key={i}
                  onMouseEnter={() => { setHovered(i); onHoverRatio?.(ratioOf(i)); onHoverSegment?.(segOf(i)) }}
                  onMouseLeave={() => { setHovered(null); onHoverRatio?.(null); onHoverSegment?.(null) }}
                  onClick={() => onTap?.(sp)}
                  style={{
                    background: isHov ? 'var(--bg-card3, rgba(120,120,120,0.16))' : (i % 2 ? 'var(--bg-card2)' : 'transparent'),
                    borderLeft: `3px solid ${isHov ? 'var(--text-mid)' : 'transparent'}`,
                    cursor: onTap ? 'pointer' : 'default',
                    transition: 'background .12s, border-color .12s',
                  }}>
                  <td style={{ padding: '7px 12px', color: 'var(--text-dim)', fontWeight: 700, whiteSpace: 'nowrap' }}>{sp.label}</td>
                  {isBike ? (
                    <>
                      <td style={tdR}>{Math.round(sp.watts)} W</td>
                      <td style={{ ...tdR, color: 'var(--primary)' }}>{Math.round(sp.normWatts)} W</td>
                    </>
                  ) : (
                    <>
                      <td style={tdR}>{paceStr(sp.speedMs)}/km</td>
                      <td style={{ ...tdR, color: 'var(--primary)' }}>{paceStr(sp.vapMs)}/km</td>
                    </>
                  )}
                  <td style={tdR}>{Math.round(sp.dPlus)} m</td>
                  <td style={tdR}>{sp.avgHr != null ? `${Math.round(sp.avgHr)}` : '—'}</td>
                  <td style={tdR}>{sp.avgTemp != null ? `${Math.round(sp.avgTemp)}°` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
const tdR: React.CSSProperties = { padding: '7px 12px', textAlign: 'right', color: 'var(--text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

// ══════════════════════════════════════════════════════════════════
// LE GRAPHIQUE (unique) — profil altimétrique + jauges rectangulaires
// (barres cliquables → modal tour) ou ligne fluide (lissé). Y allure
// gauche + altitude droite, X distance /2 km, repères rapide/moy/lent.
// ══════════════════════════════════════════════════════════════════
function AnalysisGraph({ data, splits, mode, metric, sport, accent, ramp, totalDurationS, onTap, hovered, setHovered, onHoverRatio, onHoverSegment, ratioOf, segOf, t }: {
  data: AData; splits: Split[]; mode: Mode; metric: Metric; sport: Sport
  accent: string; ramp: readonly string[]; totalDurationS: number | null
  onTap?: (sp: Split) => void
  hovered: number | null; setHovered: (i: number | null) => void
  onHoverRatio?: (r: number | null) => void; onHoverSegment?: (s: { start: number; end: number } | null) => void
  ratioOf: (i: number) => number; segOf: (i: number) => { start: number; end: number } | null
  t: (k: string) => string
}) {
  const CH = 224
  const g = computeGeom(data, splits, metric, sport, CH, 820)
  const hover = hovered
  const setHover = setHovered
  const [smoothT, setSmoothT] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const widths = barWidths(splits, g, mode, sport)
  const xs: number[] = []
  { let c = g.PAD_L; for (let i = 0; i < splits.length; i++) { xs.push(c); c += widths[i] } }

  const avgSpeed = sport === 'bike'
    ? (metric === 'pace' ? data.avgWatts : data.avgNorm)
    : (metric === 'pace' ? data.avgSpeed : data.avgVap)
  const avgY = avgSpeed > 0 ? g.yOf(avgSpeed) : null
  const fastIdx = splits.reduce((best, s, i, arr) => speedOf(s, metric, sport) > speedOf(arr[best], metric, sport) ? i : best, 0)
  const slowIdx = splits.reduce((worst, s, i, arr) => (speedOf(s, metric, sport) > 0 && speedOf(s, metric, sport) < speedOf(arr[worst], metric, sport)) ? i : worst, 0)
  const showMarkers = mode !== 'laps' && avgY !== null

  function idxAt(clientX: number): number {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return -1
    const xVB = ((clientX - rect.left) / rect.width) * g.VBW
    let acc = g.PAD_L
    for (let i = 0; i < splits.length; i++) { if (xVB >= acc && xVB < acc + widths[i]) return i; acc += widths[i] }
    return -1
  }
  function onMove(clientX: number) {
    if (mode === 'smooth') {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const xVB = ((clientX - rect.left) / rect.width) * g.VBW
      const rt = Math.max(0, Math.min(1, (xVB - g.PAD_L) / g.innerW))
      setSmoothT(rt); onHoverRatio?.(rt); onHoverSegment?.(null)
    } else {
      const i = idxAt(clientX)
      setHover(i >= 0 ? i : null)
      onHoverRatio?.(i >= 0 ? ratioOf(i) : null)
      onHoverSegment?.(i >= 0 ? segOf(i) : null)
    }
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <SectionTitle text={t('actp.training_analysis')} />
      <div
        ref={wrapRef}
        onMouseMove={e => onMove(e.clientX)}
        onMouseLeave={() => { setHover(null); setSmoothT(null); onHoverRatio?.(null); onHoverSegment?.(null) }}
        onClick={e => { if (mode !== 'smooth' && onTap) { const i = idxAt(e.clientX); if (i >= 0) onTap(splits[i]) } }}
        style={{ position: 'relative', width: '100%', paddingBottom: `${((CH + g.PAD_T + g.PAD_B) / g.VBW) * 100}%`, cursor: mode !== 'smooth' && onTap ? 'pointer' : 'crosshair' }}
      >
        <svg viewBox={`0 0 ${g.VBW} ${CH + g.PAD_T + g.PAD_B}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          {/* profil altimétrique — aire grise pleine, discrète, DERRIÈRE les jauges
              (les jauges sont semi-transparentes → le profil transparaît, façon Strava) */}
          {data.hasAlt && <path d={altitudePath(data, g)} fill="#94a3b8" opacity={0.3} stroke="none" />}
          {g.yTicks.map((m, i) => (
            <g key={'yp' + i}>
              <line x1={g.PAD_L} y1={m.y} x2={g.VBW - g.PAD_R} y2={m.y} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
              <text x={g.PAD_L - 5} y={m.y + 3} textAnchor="end" fontSize={10} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.label}</text>
            </g>
          ))}
          {yAltTicks(data, g).map((m, i) => (
            <text key={'ya' + i} x={g.VBW - g.PAD_R + 5} y={m.y + 3} textAnchor="start" fontSize={9.5} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.label}</text>
          ))}
          {xAxisTicks(data, g).map((m, i) => (
            <text key={'x' + i} x={m.x} y={CH + g.PAD_T + 15} textAnchor="middle" fontSize={10} fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.label}</text>
          ))}
          <text x={g.PAD_L} y={CH + g.PAD_T + 15} textAnchor="middle" fontSize={10} fill="var(--text-dim)">0</text>

          {avgY !== null && <line x1={g.PAD_L} y1={avgY} x2={g.VBW - g.PAD_R} y2={avgY} stroke={accent} strokeWidth={1} strokeDasharray="5 4" opacity={0.5} vectorEffect="non-scaling-stroke" />}

          {mode === 'smooth'
            ? <SmoothArea data={data} g={g} metric={metric} sport={sport} accent={accent} />
            : (
              <g key={mode + metric} style={{ transformOrigin: 'center bottom', animation: 'thwTaRise .45s cubic-bezier(.22,1,.36,1)' }}>
                {splits.map((sp, i) => {
                  const spd = speedOf(sp, metric, sport)
                  const y = g.yOf(spd), h = Math.max(2, g.baseY - y)
                  const w = Math.max(2, widths[i] - 1.4)
                  const isHov = hover === i
                  return (
                    <g key={i}>
                      <rect x={xs[i] + 0.7} y={y} width={w} height={h}
                        fill={rampColor(spd, g.minSpeed, g.maxSpeed, ramp)}
                        opacity={isHov ? 0.92 : (hover === null ? 0.72 : 0.4)} rx={2}
                        style={{ transition: 'y .4s cubic-bezier(.22,1,.36,1), height .4s cubic-bezier(.22,1,.36,1), fill .3s ease, opacity .15s' }} />
                      {w >= 16 && h >= 16 && (
                        <text x={xs[i] + widths[i] / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill={accent}
                          style={{ fontVariantNumeric: 'tabular-nums' }}>{sport === 'bike' ? Math.round(spd) : paceStr(spd)}</text>
                      )}
                      <text x={xs[i] + widths[i] / 2} y={CH + g.PAD_T + 15} textAnchor="middle" fontSize={10} fill="var(--text-dim)"
                        style={{ fontVariantNumeric: 'tabular-nums', opacity: (i === 0 || (i + 1) % Math.max(1, Math.ceil(splits.length / 14)) === 0) ? 1 : 0 }}>{sp.label}</text>
                    </g>
                  )
                })}
              </g>
            )}

          {/* curseur */}
          {mode !== 'smooth' && hover !== null && splits[hover] && (
            <line x1={xs[hover] + widths[hover] / 2} y1={g.PAD_T} x2={xs[hover] + widths[hover] / 2} y2={g.baseY} stroke={accent} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.7} />
          )}
          {mode === 'smooth' && smoothT !== null && (
            <line x1={g.PAD_L + smoothT * g.innerW} y1={g.PAD_T} x2={g.PAD_L + smoothT * g.innerW} y2={g.baseY} stroke={accent} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.7} />
          )}

          {showMarkers && <MarkerTicks data={data} g={g} splits={splits} metric={metric} sport={sport} accent={accent} fastIdx={fastIdx} slowIdx={slowIdx} avgSpeed={avgSpeed} t={t} />}
        </svg>

        {mode !== 'smooth' && hover !== null && splits[hover] && (
          <TooltipBox xPct={(xs[hover] + widths[hover] / 2) / g.VBW} accent={accent}>
            {mode === 'laps' ? <LapTooltip sp={splits[hover]} sport={sport} t={t} /> : <KmTooltip sp={splits[hover]} sport={sport} t={t} />}
          </TooltipBox>
        )}
        {mode === 'smooth' && smoothT !== null && (() => {
          const s = sampleAt(data, smoothT); if (!s) return null
          return (
            <TooltipBox xPct={(g.PAD_L + smoothT * g.innerW) / g.VBW} accent={accent}>
              <SmoothTooltip s={s} metric={metric} sport={sport} totalDurationS={totalDurationS} t={t} />
            </TooltipBox>
          )
        })()}
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
