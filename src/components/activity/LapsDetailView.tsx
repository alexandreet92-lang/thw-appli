'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatPace, speedMsToPace } from '@/lib/utils/pace'
import { useI18n } from '@/lib/i18n'

type Sport = 'cycling' | 'running'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
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
  elevation_gain_m?: number | null
}
interface StreamData {
  time?: number[]; distance?: number[]; altitude?: number[]
  heartrate?: number[]; velocity?: number[]; watts?: number[]
  cadence?: number[]; temp?: number[]
}
interface ParsedZone { label: string; min: number; max: number; color: string }

export interface LapsDetailViewProps {
  open:            boolean
  onClose:         () => void
  initialActiveLap: number
  laps:            LapData[]
  streams:         StreamData | null
  sportLabel:      string
  totalDistanceM:  number | null
  totalDurationS:  number | null
  ftp:             number | null
  bikeZones:       ParsedZone[] | null    // Z1-Z5 puissance utilisateur
  hrZones:         ParsedZone[] | null    // Z1-Z5 FC utilisateur
  maxHrEst:        number | null
  sport?:          Sport                  // 'cycling' (défaut) | 'running'
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const PURPLE_ACTIVE   = '#7c3aed'
const PURPLE_ACTIVE_2 = '#6d28d9'
const PURPLE_PALE_DAY = '#c4b5fd'
const PURPLE_PALE_NGT = '#a78bfa'
const ALT_BG_DAY      = '#e2e8f0'
const ALT_BG_NGT      = '#1e293b'

const HR_ZONE_COLORS  = ['#3b82f6', '#10b981', '#eab308', '#f97316', '#ef4444']
const HR_ZONE_NAMES   = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']
const POWER_ZONES_DEF = [
  { label: 'Z1', min: 0,    max: 0.55, color: '#ddd6fe' },
  { label: 'Z2', min: 0.55, max: 0.75, color: '#c4b5fd' },
  { label: 'Z3', min: 0.75, max: 0.90, color: '#a78bfa' },
  { label: 'Z4', min: 0.90, max: 1.05, color: '#8b5cf6' },
  { label: 'Z5', min: 1.05, max: 1.20, color: '#7c3aed' },
  { label: 'Z6', min: 1.20, max: 1.50, color: '#6b21a8' },
  { label: 'Z7', min: 1.50, max: 99,   color: '#581c87' },
]
const TEMP_ZONES_DEF = [
  { label: '< 0 °C',   min: -Infinity, max: 0,        color: '#1e1b4b' },
  { label: '0-5 °C',   min: 0,         max: 5,        color: '#312e81' },
  { label: '5-10 °C',  min: 5,         max: 10,       color: '#1e40af' },
  { label: '10-15 °C', min: 10,        max: 15,       color: '#3b82f6' },
  { label: '15-20 °C', min: 15,        max: 20,       color: '#06b6d4' },
  { label: '20-25 °C', min: 20,        max: 25,       color: '#10b981' },
  { label: '25-30 °C', min: 25,        max: 30,       color: '#eab308' },
  { label: '30-35 °C', min: 30,        max: 35,       color: '#f97316' },
  { label: '> 35 °C',  min: 35,        max: Infinity, color: '#ef4444' },
]
const CADENCE_ZONES_DEF = [
  { label: '< 50',  min: 0.01, max: 50,       color: '#1e293b' },
  { label: '50-60', min: 50,   max: 60,       color: '#475569' },
  { label: '61-70', min: 60,   max: 70,       color: '#06b6d4' },
  { label: '71-80', min: 70,   max: 80,       color: '#3b82f6' },
  { label: '81-90', min: 80,   max: 90,       color: '#10b981' },
  { label: '91-100',min: 90,   max: 100,      color: '#eab308' },
  { label: '> 100', min: 100,  max: Infinity, color: '#f97316' },
]
// Cadence running (spm) — tranches spécifiques course à pied.
const CADENCE_ZONES_RUN_DEF = [
  { label: '< 150',   min: 0.01, max: 150,      color: '#94a3b8' },
  { label: '150-160', min: 150,  max: 160,      color: '#cbd5e1' },
  { label: '161-170', min: 160,  max: 170,      color: '#06b6d4' },
  { label: '171-180', min: 170,  max: 180,      color: '#10b981' },
  { label: '181-190', min: 180,  max: 190,      color: '#eab308' },
  { label: '> 190',   min: 190,  max: Infinity, color: '#f97316' },
]
const GRAPH_HEIGHT          = 240
const LABELS_H              = 28
const Y_AXIS_W              = 50      // espace Y axis sticky à gauche
const MIN_LAP_WIDTH_MOBILE  = 95
const MIN_LAP_WIDTH_DESKTOP = 30
const MOBILE_BREAKPOINT     = 768

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function fmtDur(s: number | null | undefined): string {
  if (s == null || !isFinite(s)) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
function fmtKm(m: number | null | undefined): string {
  if (m == null) return '—'
  return `${(m / 1000).toFixed(2).replace('.', ',')} km`
}
function fmtSpeedKmh(mps: number | null | undefined): string {
  if (mps == null) return '—'
  return `${(mps * 3.6).toFixed(1).replace('.', ',')} km/h`
}
// Vitesse moy d'un tour (m/s), reconstituée depuis distance/durée si absente.
function lapSpeedMs(lap: LapData): number {
  if (lap.avg_speed_ms && lap.avg_speed_ms > 0) return lap.avg_speed_ms
  if (lap.distance_m > 0 && lap.moving_time_s > 0) return lap.distance_m / lap.moving_time_s
  return 0
}

function computeLapWidths(laps: LapData[], availableWidth: number, isMobile: boolean): number[] {
  const N = laps.length
  if (N === 0) return []
  const totalDur = laps.reduce((s, l) => s + (l.moving_time_s || 0), 0)
  const minW     = isMobile ? MIN_LAP_WIDTH_MOBILE : MIN_LAP_WIDTH_DESKTOP

  // Étape 1 : largeur proportionnelle pure à la durée
  const proportional = laps.map(l => (totalDur > 0 ? (l.moving_time_s / totalDur) * availableWidth : availableWidth / N))

  // Étape 2 : appliquer le min
  const withMin = proportional.map(w => Math.max(w, minW))
  const totalWithMin = withMin.reduce((s, w) => s + w, 0)

  if (totalWithMin <= availableWidth) {
    // Tout tient : redistribuer le surplus aux laps non-min, proportionnellement à leur taille actuelle
    const surplus = availableWidth - totalWithMin
    const nonMinIdx = withMin.map((w, i) => ({ w, i, isMin: w === minW })).filter(x => !x.isMin)
    if (nonMinIdx.length === 0) return withMin
    const nonMinTotal = nonMinIdx.reduce((s, x) => s + x.w, 0) || 1
    return withMin.map((w) => {
      if (w === minW) return w
      return w + (w / nonMinTotal) * surplus
    })
  }
  // Dépasse → scroll horizontal prend le relai
  return withMin
}

// Renvoie une clé i18n (traduite au rendu) plutôt qu'un libellé FR en dur.
function cadenceDescriptor(cad: number | null | undefined): string | null {
  if (cad == null || cad <= 0) return null
  if (cad < 70) return 'activities.cadInForce'
  if (cad <= 90) return 'activities.cadInCadence'
  return 'activities.cadInVelocity'
}
function powerZoneLabel(watts: number | null | undefined, ftp: number | null): string {
  if (watts == null || !ftp || ftp <= 0) return '—'
  const r = watts / ftp
  for (const z of POWER_ZONES_DEF) if (r < z.max) return `Zone ${z.label.replace('Z', '')}`
  return 'Zone 7'
}

// ─────────────────────────────────────────────────────────────
// Donut
// ─────────────────────────────────────────────────────────────
interface ZoneArc { label: string; pct: number; color: string }
function polarXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}
function donutArcPath(cx: number, cy: number, rOut: number, rIn: number, startAng: number, endAng: number): string {
  const lg = endAng - startAng > Math.PI ? 1 : 0
  const os = polarXY(cx, cy, rOut, startAng), oe = polarXY(cx, cy, rOut, endAng)
  const is = polarXY(cx, cy, rIn, startAng),  ie = polarXY(cx, cy, rIn, endAng)
  return [
    `M ${os.x.toFixed(2)} ${os.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${lg} 1 ${oe.x.toFixed(2)} ${oe.y.toFixed(2)}`,
    `L ${ie.x.toFixed(2)} ${ie.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${lg} 0 ${is.x.toFixed(2)} ${is.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}
function MiniDonut({ title, data, size = 80 }: { title: string; data: ZoneArc[]; size?: number }) {
  const totalPct = data.reduce((s, d) => s + d.pct, 0)
  if (totalPct <= 0) return null
  const CX = size / 2, CY = size / 2
  const R_OUT = size / 2 - 4, R_IN = size / 2 - 18
  let cum = 0
  const visible = data.filter(d => d.pct > 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{title}</div>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke="var(--bg-card2)" strokeWidth={R_OUT - R_IN} />
        {data.map((d, i) => {
          if (d.pct <= 0) return null
          const sa = -Math.PI / 2 + (cum / totalPct) * 2 * Math.PI
          const ea = -Math.PI / 2 + ((cum + d.pct) / totalPct) * 2 * Math.PI
          cum += d.pct
          return <path key={i} d={donutArcPath(CX, CY, R_OUT, R_IN, sa, ea)} fill={d.color} />
        })}
      </svg>
      <ul style={{
        listStyle: 'none', margin: 0, padding: 0, width: '100%',
        display: 'flex', flexDirection: 'column', gap: 2,
        fontSize: 9, color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
      }}>
        {visible.map((d, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{Math.round((d.pct / totalPct) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Calcul des distributions sur la portion d'un lap
// ─────────────────────────────────────────────────────────────
function sliceArr<T>(arr: T[] | undefined | null, i1: number, i2: number): T[] | null {
  if (!arr) return null
  const s = Math.max(0, i1), e = Math.min(arr.length, i2 + 1)
  if (e <= s) return null
  return arr.slice(s, e)
}
function distrHr(hrSlice: number[] | null, hrZones: ParsedZone[] | null): ZoneArc[] {
  if (!hrSlice || hrSlice.length === 0) return []
  let buckets: { label: string; min: number; max: number; color: string }[] = []
  if (hrZones && hrZones.length >= 5) {
    buckets = hrZones.slice(0, 5).map((z, i) => ({
      label: HR_ZONE_NAMES[i], min: z.min, max: i === 4 ? Infinity : (z.max ?? Infinity),
      color: HR_ZONE_COLORS[i],
    }))
  } else {
    const hrMax = Math.max(...hrSlice)
    const th = [0.6, 0.7, 0.8, 0.9].map(p => p * hrMax)
    buckets = HR_ZONE_NAMES.map((name, i) => ({
      label: name, color: HR_ZONE_COLORS[i],
      min: i === 0 ? 0 : th[i - 1],
      max: i === 4 ? Infinity : th[i],
    }))
  }
  const cnt = buckets.map(() => 0)
  hrSlice.forEach(h => { for (let i = 0; i < buckets.length; i++) if (h < buckets[i].max) { cnt[i]++; break } })
  const tot = hrSlice.length || 1
  return buckets.map((b, i) => ({ label: b.label, pct: (cnt[i] / tot) * 100, color: b.color }))
}
function distrPower(wSlice: number[] | null, ftp: number | null): ZoneArc[] {
  if (!wSlice || wSlice.length === 0) return []
  if (!ftp || ftp <= 0) ftp = 200
  const cnt = POWER_ZONES_DEF.map(() => 0)
  wSlice.forEach(w => {
    if (w == null || isNaN(w)) return
    const r = w / ftp!
    for (let i = 0; i < POWER_ZONES_DEF.length; i++) if (r < POWER_ZONES_DEF[i].max) { cnt[i]++; break }
  })
  const tot = wSlice.length || 1
  return POWER_ZONES_DEF.map((z, i) => ({ label: z.label, pct: (cnt[i] / tot) * 100, color: z.color }))
}
function distrTemp(tSlice: number[] | null): ZoneArc[] {
  if (!tSlice || tSlice.length === 0) return []
  const cnt = TEMP_ZONES_DEF.map(() => 0)
  let tot = 0
  tSlice.forEach(t => {
    if (t == null || isNaN(t)) return
    tot++
    for (let i = 0; i < TEMP_ZONES_DEF.length; i++) {
      const d = TEMP_ZONES_DEF[i]
      if (t >= d.min && t < d.max) { cnt[i]++; break }
    }
  })
  if (tot === 0) return []
  return TEMP_ZONES_DEF.map((d, i) => ({ label: d.label, pct: (cnt[i] / tot) * 100, color: d.color }))
}
function distrCad(cSlice: number[] | null, sport: Sport = 'cycling'): ZoneArc[] {
  if (!cSlice || cSlice.length === 0) return []
  const def = sport === 'running' ? CADENCE_ZONES_RUN_DEF : CADENCE_ZONES_DEF
  const cnt = def.map(() => 0)
  let tot = 0
  cSlice.forEach(c => {
    if (c == null || isNaN(c) || c <= 0) return
    tot++
    for (let i = 0; i < def.length; i++) {
      if (c >= def[i].min && c < def[i].max) { cnt[i]++; break }
    }
  })
  if (tot === 0) return []
  return def.map((d, i) => ({ label: d.label, pct: (cnt[i] / tot) * 100, color: d.color }))
}

// ─────────────────────────────────────────────────────────────
// LapDetailsSheet — Niveau 2 (bottom sheet)
// ─────────────────────────────────────────────────────────────
function HeroStat({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  const isEmpty = value === '—'
  return (
    <div style={{ textAlign: 'center', padding: '0 8px' }}>
      <div style={{
        fontSize: 9, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--text-dim)', marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 24, fontWeight: 700, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color: isEmpty ? 'var(--text-dim)' : (color ?? 'var(--text)'),
      }}>
        {value}
        {unit && !isEmpty && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, marginLeft: 2 }}>{unit}</span>
        )}
      </div>
    </div>
  )
}
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function LapDetailsSheet({ open, onClose, lap, lapIndex, streams, ftp, bikeZones, hrZones, sport }: {
  open:      boolean
  onClose:   () => void
  lap:       LapData
  lapIndex:  number
  streams:   StreamData | null
  ftp:       number | null
  bikeZones: ParsedZone[] | null
  hrZones:   ParsedZone[] | null
  sport:     Sport
}) {
  const { t } = useI18n()
  void bikeZones
  const isRun = sport === 'running'
  const [closing, setClosing] = useState(false)
  useEffect(() => { if (open) setClosing(false) }, [open])
  function doClose() { setClosing(true); setTimeout(onClose, 280) }

  const i1 = lap.start_index ?? 0
  const i2 = lap.end_index   ?? (i1 + Math.max(0, lap.moving_time_s - 1))
  const wSlice  = sliceArr(streams?.watts,     i1, i2)
  const hrSlice = sliceArr(streams?.heartrate, i1, i2)
  const tSlice  = sliceArr(streams?.temp,      i1, i2)
  const cSlice  = sliceArr(streams?.cadence,   i1, i2)
  const altSlice = sliceArr(streams?.altitude, i1, i2)

  const npSeg = useMemo(() => {
    if (!wSlice || wSlice.length < 30) return null
    const roll: number[] = []
    for (let i = 29; i < wSlice.length; i++) {
      let s = 0; for (let j = i - 29; j <= i; j++) s += wSlice[j]
      roll.push(s / 30)
    }
    if (!roll.length) return null
    const m4 = roll.reduce((a, b) => a + Math.pow(b, 4), 0) / roll.length
    return Math.round(Math.pow(m4, 0.25))
  }, [wSlice])

  let dPlus = 0, dMinus = 0
  if (altSlice) for (let i = 1; i < altSlice.length; i++) {
    const d = altSlice[i] - altSlice[i - 1]
    if (d > 0) dPlus += d; else dMinus += -d
  }
  const tAvg = tSlice ? tSlice.reduce((s, v) => s + v, 0) / tSlice.length : null
  const cAvgPedal = (() => {
    if (!cSlice) return null
    const non0 = cSlice.filter(v => v > 0)
    return non0.length ? non0.reduce((s, v) => s + v, 0) / non0.length : null
  })()

  // ── Running : allure moy / max / ajustée (GAP) ──
  const vSlice = sliceArr(streams?.velocity, i1, i2)
  const avgPaceMin = lap.avg_speed_ms && lap.avg_speed_ms > 0
    ? speedMsToPace(lap.avg_speed_ms)
    : (lap.distance_m > 0 && lap.moving_time_s > 0 ? (lap.moving_time_s / 60) / (lap.distance_m / 1000) : Infinity)
  // Allure max = vitesse instantanée la plus rapide (filtrée des spikes GPS < 2'/km).
  const maxPaceMin = (() => {
    if (!vSlice || !vSlice.length) return Infinity
    const mx = Math.max(...vSlice.filter(v => v > 0))
    if (!isFinite(mx) || mx <= 0) return Infinity
    const p = speedMsToPace(mx)
    return p < 2 ? Infinity : p   // ignore les valeurs irréalistes
  })()
  // Allure ajustée (GAP) via pente nette du tour (approx. Minetti).
  const gapPaceMin = (() => {
    if (!isFinite(avgPaceMin) || avgPaceMin <= 0 || !altSlice || altSlice.length < 2 || lap.distance_m <= 0) return null
    const net = altSlice[altSlice.length - 1] - altSlice[0]
    const g = net / lap.distance_m
    if (Math.abs(g) < 0.002) return avgPaceMin
    const factor = 1 + g * 5.43 + g * g * 18.84
    return avgPaceMin / Math.max(0.5, Math.min(2.5, factor))
  })()

  const hrDist = distrHr(hrSlice, hrZones)
  const pwDist = distrPower(wSlice, ftp)
  const tDist  = distrTemp(tSlice)
  const cDist  = distrCad(cSlice, sport)
  const donuts: { title: string; data: ZoneArc[] }[] = []
  if (hrDist.length > 0) donuts.push({ title: t('activities.hrZones'),    data: hrDist })
  if (!isRun && pwDist.length > 0) donuts.push({ title: t('activities.power'),   data: pwDist })
  if (tDist.length  > 0) donuts.push({ title: t('activities.temperature'), data: tDist  })
  if (cDist.length  > 0) donuts.push({ title: t('activities.cadence'),     data: cDist  })

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <style>{`
        @keyframes lapSheetFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes lapSheetFadeOut { from{opacity:1} to{opacity:0} }
        @keyframes lapSheetUp      { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes lapSheetDown    { from{transform:translateY(0)} to{transform:translateY(100%)} }
      `}</style>
      <div
        onClick={doClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 14800,
          background: 'rgba(0,0,0,0.55)',
          animation: `${closing ? 'lapSheetFadeOut 0.28s ease-in forwards' : 'lapSheetFadeIn 0.3s ease-out'}`,
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 14900,
          background: 'var(--bg)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '90vh', overflowY: 'auto',
          padding: 16, paddingBottom: 28,
          boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
          maxWidth: 600, margin: '0 auto',
          animation: `${closing ? 'lapSheetDown 0.28s ease-in forwards' : 'lapSheetUp 0.3s cubic-bezier(0.4,0,0.2,1)'}`,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--text-dim)', opacity: 0.4, margin: '0 auto 14px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, padding: '0 4px' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{t('activities.lapDetailsTitle', { n: lapIndex + 1 })}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {fmtKm(lap.distance_m)} · {fmtDur(lap.moving_time_s)}
              {isRun ? ` · ${formatPace(avgPaceMin)}/km` : ` · ${powerZoneLabel(lap.avg_watts, ftp)}`}
            </div>
          </div>
          <button
            onClick={doClose}
            aria-label={t('activities.close')}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--bg-card2)', border: 'none',
              color: 'var(--text)', fontSize: 14, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >×</button>
        </div>

        {/* Hero KPIs 2x2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
          padding: '12px 0 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ borderRight: '1px solid var(--border)' }}>
            <HeroStat label={t('activities.distance')}  value={lap.distance_m != null ? (lap.distance_m / 1000).toFixed(2).replace('.', ',') : '—'} unit="km" />
          </div>
          <div>
            {isRun
              ? <HeroStat label={t('activities.avgPaceLegend')} value={formatPace(avgPaceMin)} unit="/km" color="#10b981" />
              : <HeroStat label={t('activities.wattsAvgDot')} value={lap.avg_watts != null ? `${Math.round(lap.avg_watts)}` : '—'} unit="W" color={PURPLE_ACTIVE} />}
          </div>
          <div style={{ borderRight: '1px solid var(--border)', borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
            <HeroStat label={t('activities.hrAvgDot')}    value={lap.avg_hr != null ? `${Math.round(lap.avg_hr)}` : '—'} unit="bpm" color="#f97316" />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
            {isRun
              ? (gapPaceMin != null
                  ? <HeroStat label={t('activities.adjustedPace')} value={formatPace(gapPaceMin)} unit="/km" color="#7c3aed" />
                  : <HeroStat label={t('activities.maxPace')} value={formatPace(maxPaceMin)} unit="/km" color="#7c3aed" />)
              : <HeroStat label={t('activities.avgSpeed')}  value={lap.avg_speed_ms != null ? (lap.avg_speed_ms * 3.6).toFixed(1).replace('.', ',') : '—'} unit="km/h" color="#06b6d4" />}
          </div>
        </div>

        {/* Détails */}
        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <DetailRow label={t('activities.duration')}         value={fmtDur(lap.moving_time_s)} />
          {isRun
            ? <DetailRow label={t('activities.maxPace')} value={isFinite(maxPaceMin) ? `${formatPace(maxPaceMin)}/km` : '—'} />
            : <DetailRow label={t('activities.normalizedWatts')} value={npSeg != null ? `${npSeg} W` : '—'} />}
          <DetailRow label="D+"            value={altSlice ? `+${Math.round(dPlus)} m` : '—'} />
          <DetailRow label="D−"            value={altSlice ? `−${Math.round(dMinus)} m` : '—'} />
          <DetailRow label={t('activities.cadenceAvg')}  value={cAvgPedal != null ? `${Math.round(cAvgPedal)} ${isRun ? 'spm' : 'rpm'}` : '—'} />
          <DetailRow label={t('activities.tempAvgDot')}    value={tAvg != null ? `${Math.round(tAvg)} °C` : '—'} />
        </div>

        {/* Donuts */}
        {donuts.length > 0 && (
          <div style={{ padding: '14px 0 4px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-dim)', marginBottom: 12,
            }}>{t('activities.distributions')}</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: donuts.length >= 3 ? 'repeat(2, 1fr)' : `repeat(${donuts.length}, 1fr)`,
              gap: 16,
            }}>
              {donuts.map(d => <MiniDonut key={d.title} title={d.title} data={d.data} size={80} />)}
            </div>
          </div>
        )}
      </div>
    </>,
    document.body,
  )
}

// ─────────────────────────────────────────────────────────────
// LapsDetailView — Niveau 1
// ─────────────────────────────────────────────────────────────
export function LapsDetailView(props: LapsDetailViewProps) {
  const { t } = useI18n()
  const { open, onClose, initialActiveLap, laps, streams, sportLabel,
          totalDistanceM, totalDurationS, ftp, bikeZones, hrZones } = props
  const isRun = props.sport === 'running'
  // Valeur d'un tour pilotant la hauteur des barres : vitesse (run) ou watts (vélo).
  const metricOf = (l: LapData): number => isRun ? lapSpeedMs(l) : (l.avg_watts ?? 0)


  console.log('[LAPS-FORCE] LapsDetailView render, props:', {
    open, initialActiveLap,
    lapsCount: laps?.length ?? 0,
    hasStreams: !!streams,
    hasAltitude: !!streams?.altitude,
  })

  // Dark mode detection (best-effort, recompute au mount)
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const upd = () => setIsDark(mq.matches || document.documentElement.classList.contains('dark'))
    upd()
    mq.addEventListener?.('change', upd)
    return () => mq.removeEventListener?.('change', upd)
  }, [])

  const [activeLap, setActiveLap] = useState(initialActiveLap)
  const [closing, setClosing] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  useEffect(() => { if (open) { setClosing(false); setActiveLap(initialActiveLap) } }, [open, initialActiveLap])
  function doClose() { setClosing(true); setTimeout(onClose, 320) }

  const scrollerRef = useRef<HTMLDivElement>(null)
  const listRowsRef = useRef<Map<number, HTMLButtonElement | null>>(new Map())

  // Largeur disponible mesurée — fournit la pleine largeur sur desktop
  const [availW, setAvailW] = useState(0)
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const upd = () => {
      // largeur visible du scroller = viewport - Y axis sticky
      setAvailW(Math.max(0, sc.clientWidth))
    }
    upd()
    const ro = new ResizeObserver(upd)
    ro.observe(sc)
    window.addEventListener('resize', upd)
    return () => { ro.disconnect(); window.removeEventListener('resize', upd) }
  }, [open])

  const isMobile = availW > 0 && availW < MOBILE_BREAKPOINT
  const lapWidths = useMemo(
    () => computeLapWidths(laps, availW || 800, isMobile),
    [laps, availW, isMobile],
  )
  const lapPositions = useMemo(() => {
    const pos: number[] = [0]
    for (let i = 0; i < lapWidths.length - 1; i++) pos.push(pos[i] + lapWidths[i])
    return pos
  }, [lapWidths])
  const totalGraphW = lapWidths.reduce((s, w) => s + w, 0)

  // Range Y du graphique (max de la métrique : vitesse run / watts vélo)
  const maxYW = useMemo(() => {
    const m = laps.reduce((acc, l) => Math.max(acc, metricOf(l)), 0)
    if (isRun) return m > 0 ? m * 1.05 : 1
    return Math.max(60, Math.ceil((m + 20) / 10) * 10)
  }, [laps, isRun]) // eslint-disable-line react-hooks/exhaustive-deps
  // Étiquettes Y : allure (run, rapide en haut) ou watts (vélo).
  const yLabels = useMemo(() => {
    const steps = 5
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = maxYW * (steps - i) / steps
      return isRun ? (val > 0 ? formatPace(speedMsToPace(val)) : '—') : String(Math.round(val))
    })
  }, [maxYW, isRun])

  // Profil altitude — normalisé sur le totalGraphW dynamique (path viewBox = même W)
  const altPath = useMemo(() => {
    const alt = streams?.altitude
    if (!alt || alt.length < 2 || totalGraphW <= 0) return ''
    const mn = Math.min(...alt), mx = Math.max(...alt), rg = (mx - mn) || 1
    const W = totalGraphW
    const pts = alt.map((v, i) => {
      const x = (i / (alt.length - 1)) * W
      const y = (1 - (v - mn) / rg) * GRAPH_HEIGHT
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M0,${GRAPH_HEIGHT}L${pts.join('L')}L${W},${GRAPH_HEIGHT}Z`
  }, [streams?.altitude, totalGraphW])

  // Auto-scroll vers la barre active (positions dynamiques)
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const left = (lapPositions[activeLap] ?? 0)
    const w    = (lapWidths[activeLap] ?? 0)
    const target = left + w / 2 - sc.clientWidth / 2
    sc.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    const row = listRowsRef.current.get(activeLap)
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeLap, lapPositions, lapWidths])

  const aLap = laps[activeLap] ?? laps[0]
  const aWatts = aLap?.avg_watts != null ? Math.round(aLap.avg_watts) : null
  const aCadDesc = cadenceDescriptor(aLap?.avg_cadence)
  const aZone = powerZoneLabel(aLap?.avg_watts, ftp)
  // Running : allure du tour actif + cadence spm + zone FC (si dispo).
  const aPace = aLap ? speedMsToPace(lapSpeedMs(aLap)) : Infinity
  const aSpm  = aLap?.avg_cadence != null && aLap.avg_cadence > 0 ? Math.round(aLap.avg_cadence) : null
  const aHrZone = (() => {
    if (!isRun || aLap?.avg_hr == null || !hrZones || hrZones.length < 5) return null
    const hr = aLap.avg_hr
    for (let i = 0; i < 5; i++) {
      const z = hrZones[i]
      const max = i === 4 ? Infinity : (z.max ?? Infinity)
      if (hr >= z.min && hr < max) return `Zone ${i + 1}`
    }
    return null
  })()

  const altBgColor   = isDark ? ALT_BG_NGT      : ALT_BG_DAY
  const purplePale   = isDark ? PURPLE_PALE_NGT : PURPLE_PALE_DAY

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <style>{`
        @keyframes lapsViewIn  { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes lapsViewOut { from{transform:translateX(0)} to{transform:translateX(100%)} }
        .laps-scroller::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column',
          animation: `${closing ? 'lapsViewOut 0.32s cubic-bezier(0.4,0,0.2,1) forwards' : 'lapsViewIn 0.3s cubic-bezier(0.4,0,0.2,1)'}`,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <button
            onClick={doClose}
            aria-label={t('activities.back')}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--bg-card2)', border: 'none',
              color: 'var(--text)', fontSize: 22, lineHeight: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>{t('activities.laps')}</h1>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {sportLabel} · {fmtKm(totalDistanceM)} · {fmtDur(totalDurationS)}
            </div>
          </div>
        </header>

        {/* Bandeau récap */}
        <div style={{
          background: 'var(--bg-card2)',
          padding: 16,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 10, fontSize: 12, color: 'var(--text)',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border)',
        }}>
          <strong style={{ color: 'var(--text)' }}>{t('activities.lapNumber', { n: activeLap + 1 })}</strong>
          <span style={{ color: 'var(--text-dim)' }}>·</span>
          {isRun ? (
            <>
              <span style={{ color: PURPLE_ACTIVE, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {isFinite(aPace) ? `${formatPace(aPace)}/km` : '—'}
              </span>
              {aHrZone && (
                <>
                  <span style={{ color: 'var(--text-dim)' }}>·</span>
                  <span>{aHrZone}</span>
                </>
              )}
              {aSpm != null && (
                <>
                  <span style={{ color: 'var(--text-dim)' }}>·</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{aSpm} spm</span>
                </>
              )}
            </>
          ) : (
            <>
              <span style={{ color: PURPLE_ACTIVE, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {aWatts != null ? `${aWatts} W` : '—'}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>·</span>
              <span>{aZone}</span>
              {aCadDesc && (
                <>
                  <span style={{ color: 'var(--text-dim)' }}>·</span>
                  <span>{t(aCadDesc)}</span>
                </>
              )}
            </>
          )}
        </div>

        {/* Graphique scrollable */}
        <div style={{ position: 'relative', padding: '16px 0 0' }}>
          {/* Y labels sticky */}
          <div style={{
            position: 'absolute', left: 12, top: 16,
            width: 32, height: GRAPH_HEIGHT,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            zIndex: 3, pointerEvents: 'none',
          }}>
            {yLabels.map((v, i) => (
              <span key={i} style={{
                fontSize: 9, color: 'var(--text-dim)',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
              }}>{v}</span>
            ))}
          </div>
          <div
            ref={scrollerRef}
            className="laps-scroller"
            style={{
              marginLeft: Y_AXIS_W, overflowX: 'auto', overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div style={{ position: 'relative', width: totalGraphW || '100%', paddingRight: 16 }}>
              {/* Container des barres + altitude */}
              <div style={{
                position: 'relative', width: totalGraphW || '100%', height: GRAPH_HEIGHT,
                overflow: 'hidden',
              }}>
                {altPath && totalGraphW > 0 && (
                  <svg
                    viewBox={`0 0 ${totalGraphW} ${GRAPH_HEIGHT}`}
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                  >
                    <path d={altPath} fill={altBgColor} />
                  </svg>
                )}
                {laps.map((lap, i) => {
                  const w = metricOf(lap)
                  const h = w > 0 ? (w / maxYW) * GRAPH_HEIGHT : 2
                  const isActive = i === activeLap
                  const lw = lapWidths[i] ?? 0
                  const lx = lapPositions[i] ?? 0
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        console.log('[LAPS] Tap sur barre index:', i)
                        setActiveLap(i)
                      }}
                      aria-label={`Tour ${i + 1}`}
                      style={{
                        // Hit target : couvre TOUTE la hauteur de la colonne (240 px)
                        // pour faciliter le tap mobile au doigt
                        position: 'absolute', top: 0, bottom: 0,
                        left: lx, width: lw,
                        background: 'transparent',
                        border: 'none', padding: 0, margin: 0,
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        touchAction: 'manipulation',
                        zIndex: 1,
                        transition: 'left 0.2s ease, width 0.2s ease',
                      }}
                    >
                      {/* Barre visuelle non interactive — pointer-events:none
                          pour que le tap traverse jusqu'au <button> parent */}
                      <span
                        style={{
                          position: 'absolute', bottom: 0,
                          left: 1, right: 1,
                          height: h,
                          background: isActive ? PURPLE_ACTIVE : purplePale,
                          opacity: isActive ? 0.95 : (isDark ? 0.7 : 0.85),
                          borderRadius: '3px 3px 0 0',
                          pointerEvents: 'none',
                          display: 'block',
                          transition: 'background 0.2s ease, opacity 0.2s ease, height 0.2s ease',
                        }}
                      />
                    </button>
                  )
                })}
                {/* Active underline */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: (lapPositions[activeLap] ?? 0) + 2,
                    width: Math.max(0, (lapWidths[activeLap] ?? 0) - 4),
                    height: 4,
                    background: isDark ? PURPLE_PALE_NGT : PURPLE_ACTIVE,
                    borderRadius: 2,
                    transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)',
                    zIndex: 3, pointerEvents: 'none',
                  }}
                />
              </div>
              {/* X labels */}
              <div style={{
                position: 'relative', width: totalGraphW || '100%', height: LABELS_H,
                background: 'var(--bg)',
              }}>
                {laps.map((_, i) => {
                  const isActive = i === activeLap
                  const lw = lapWidths[i] ?? 0
                  const lx = lapPositions[i] ?? 0
                  return (
                    <span
                      key={i}
                      style={{
                        position: 'absolute',
                        left: lx, top: 6,
                        width: lw, textAlign: 'center',
                        fontSize: isActive ? 13 : 12,
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? 'var(--text)' : 'var(--text-dim)',
                        fontVariantNumeric: 'tabular-nums',
                        transition: 'color 0.2s, font-weight 0.2s, left 0.2s, width 0.2s',
                      }}
                    >{i + 1}</span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Liste des autres tours */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{
            padding: '16px 16px 8px',
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}>{t('activities.otherLaps')}</div>
          {laps.map((lap, i) => {
            const isActive = i === activeLap
            return (
              <button
                key={i}
                ref={el => { listRowsRef.current.set(i, el) }}
                onClick={() => setActiveLap(i)}
                style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr',
                  gap: 8,
                  width: '100%',
                  padding: '13px 16px',
                  background: isActive ? (isDark ? 'rgba(124,58,237,0.15)' : '#ede9fe') : 'transparent',
                  borderLeft: isActive ? `3px solid ${PURPLE_ACTIVE}` : '3px solid transparent',
                  borderRadius: isActive ? 8 : 0,
                  cursor: 'pointer', textAlign: 'left',
                  alignItems: 'center',
                  fontFamily: 'inherit',
                  transition: 'background 0.2s ease',
                }}
              >
                <span style={{
                  fontSize: 14,
                  fontWeight: isActive ? 800 : 700,
                  color: isActive ? PURPLE_ACTIVE : 'var(--text-dim)',
                  fontVariantNumeric: 'tabular-nums',
                }}>{i + 1}</span>
                <span style={{
                  fontSize: 13, fontWeight: 600, textAlign: 'center',
                  color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
                }}>{fmtKm(lap.distance_m)}</span>
                <span style={{
                  fontSize: 13, fontWeight: 600, textAlign: 'center',
                  color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
                }}>{fmtDur(lap.moving_time_s)}</span>
                <span style={{
                  fontSize: 13, fontWeight: 600, textAlign: 'center',
                  color: PURPLE_ACTIVE, fontVariantNumeric: 'tabular-nums',
                }}>{isRun
                  ? `${formatPace(speedMsToPace(lapSpeedMs(lap)))}/km`
                  : (lap.avg_watts != null ? `${Math.round(lap.avg_watts)} W` : '—')}</span>
              </button>
            )
          })}
        </div>

        {/* CTA Détails — compact aligné à droite */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => setDetailsOpen(true)}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            style={{
              background: PURPLE_ACTIVE,
              color: '#fff',
              padding: '10px 18px',
              borderRadius: 8, border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s ease, transform 0.1s ease',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = PURPLE_ACTIVE_2 }}
            onMouseOut={e => { e.currentTarget.style.background = PURPLE_ACTIVE }}
          >
            {t('activities.lapDetailsCta', { n: activeLap + 1 })}
          </button>
        </div>
      </div>

      {/* Niveau 2 — Bottom sheet */}
      <LapDetailsSheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        lap={aLap}
        lapIndex={activeLap}
        streams={streams}
        ftp={ftp}
        bikeZones={bikeZones}
        hrZones={hrZones}
        sport={isRun ? 'running' : 'cycling'}
      />
    </>,
    document.body,
  )
}
