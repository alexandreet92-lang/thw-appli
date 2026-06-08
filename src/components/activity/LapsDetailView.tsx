'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  { label: '< 10 °C',  min: -Infinity, max: 10,       color: '#1e40af' },
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
const BAR_WIDTH    = 50
const GRAPH_HEIGHT = 240
const LABELS_H     = 28

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

function cadenceDescriptor(cad: number | null | undefined): string | null {
  if (cad == null || cad <= 0) return null
  if (cad < 70) return 'En force'
  if (cad <= 90) return 'En cadence'
  return 'En vélocité'
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
function distrCad(cSlice: number[] | null): ZoneArc[] {
  if (!cSlice || cSlice.length === 0) return []
  const cnt = CADENCE_ZONES_DEF.map(() => 0)
  let tot = 0
  cSlice.forEach(c => {
    if (c == null || isNaN(c) || c <= 0) return
    tot++
    for (let i = 0; i < CADENCE_ZONES_DEF.length; i++) {
      const d = CADENCE_ZONES_DEF[i]
      if (c >= d.min && c < d.max) { cnt[i]++; break }
    }
  })
  if (tot === 0) return []
  return CADENCE_ZONES_DEF.map((d, i) => ({ label: d.label, pct: (cnt[i] / tot) * 100, color: d.color }))
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

function LapDetailsSheet({ open, onClose, lap, lapIndex, streams, ftp, bikeZones, hrZones }: {
  open:      boolean
  onClose:   () => void
  lap:       LapData
  lapIndex:  number
  streams:   StreamData | null
  ftp:       number | null
  bikeZones: ParsedZone[] | null
  hrZones:   ParsedZone[] | null
}) {
  void bikeZones
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

  const hrDist = distrHr(hrSlice, hrZones)
  const pwDist = distrPower(wSlice, ftp)
  const tDist  = distrTemp(tSlice)
  const cDist  = distrCad(cSlice)
  const donuts: { title: string; data: ZoneArc[] }[] = []
  if (hrDist.length > 0) donuts.push({ title: 'FC zones',    data: hrDist })
  if (pwDist.length > 0) donuts.push({ title: 'Puissance',   data: pwDist })
  if (tDist.length  > 0) donuts.push({ title: 'Température', data: tDist  })
  if (cDist.length  > 0) donuts.push({ title: 'Cadence',     data: cDist  })

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
          position: 'fixed', inset: 0, zIndex: 1050,
          background: 'rgba(0,0,0,0.55)',
          animation: `${closing ? 'lapSheetFadeOut 0.28s ease-in forwards' : 'lapSheetFadeIn 0.3s ease-out'}`,
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100,
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
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Tour {lapIndex + 1} — Détails</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {fmtKm(lap.distance_m)} · {fmtDur(lap.moving_time_s)} · {powerZoneLabel(lap.avg_watts, ftp)}
            </div>
          </div>
          <button
            onClick={doClose}
            aria-label="Fermer"
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
            <HeroStat label="Distance"  value={lap.distance_m != null ? (lap.distance_m / 1000).toFixed(2).replace('.', ',') : '—'} unit="km" />
          </div>
          <div>
            <HeroStat label="Watts moy." value={lap.avg_watts != null ? `${Math.round(lap.avg_watts)}` : '—'} unit="W" color={PURPLE_ACTIVE} />
          </div>
          <div style={{ borderRight: '1px solid var(--border)', borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
            <HeroStat label="FC moy."    value={lap.avg_hr != null ? `${Math.round(lap.avg_hr)}` : '—'} unit="bpm" color="#f97316" />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
            <HeroStat label="Vit. moy."  value={lap.avg_speed_ms != null ? (lap.avg_speed_ms * 3.6).toFixed(1).replace('.', ',') : '—'} unit="km/h" color="#06b6d4" />
          </div>
        </div>

        {/* Détails */}
        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <DetailRow label="Durée"         value={fmtDur(lap.moving_time_s)} />
          <DetailRow label="Watts normalisés (NP)" value={npSeg != null ? `${npSeg} W` : '—'} />
          <DetailRow label="D+"            value={altSlice ? `+${Math.round(dPlus)} m` : '—'} />
          <DetailRow label="D−"            value={altSlice ? `−${Math.round(dMinus)} m` : '—'} />
          <DetailRow label="Cadence moy."  value={cAvgPedal != null ? `${Math.round(cAvgPedal)} rpm` : '—'} />
          <DetailRow label="Temp. moy."    value={tAvg != null ? `${Math.round(tAvg)} °C` : '—'} />
        </div>

        {/* Donuts */}
        {donuts.length > 0 && (
          <div style={{ padding: '14px 0 4px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--text-dim)', marginBottom: 12,
            }}>Répartitions</div>
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
  const { open, onClose, initialActiveLap, laps, streams, sportLabel,
          totalDistanceM, totalDurationS, ftp, bikeZones, hrZones } = props

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

  // Range Y du graphique
  const maxYW = useMemo(() => {
    const m = laps.reduce((acc, l) => Math.max(acc, l.avg_watts ?? 0), 0)
    return Math.max(60, Math.ceil((m + 20) / 10) * 10)
  }, [laps])
  const yLabels = useMemo(() => {
    const steps = 5
    return Array.from({ length: steps + 1 }, (_, i) => Math.round(maxYW * (steps - i) / steps))
  }, [maxYW])

  // Profil altitude — normalisé sur l'activité entière
  const altPath = useMemo(() => {
    const alt = streams?.altitude
    if (!alt || alt.length < 2) return ''
    const mn = Math.min(...alt), mx = Math.max(...alt), rg = (mx - mn) || 1
    const W = laps.length * BAR_WIDTH
    const pts = alt.map((v, i) => {
      const x = (i / (alt.length - 1)) * W
      const y = (1 - (v - mn) / rg) * GRAPH_HEIGHT
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M0,${GRAPH_HEIGHT}L${pts.join('L')}L${W},${GRAPH_HEIGHT}Z`
  }, [streams?.altitude, laps.length])

  // Auto-scroll vers la barre active
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const target = activeLap * BAR_WIDTH - sc.clientWidth / 2 + BAR_WIDTH / 2
    sc.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    const row = listRowsRef.current.get(activeLap)
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeLap])

  const aLap = laps[activeLap] ?? laps[0]
  const aWatts = aLap?.avg_watts != null ? Math.round(aLap.avg_watts) : null
  const aCadDesc = cadenceDescriptor(aLap?.avg_cadence)
  const aZone = powerZoneLabel(aLap?.avg_watts, ftp)

  const altBgColor   = isDark ? ALT_BG_NGT      : ALT_BG_DAY
  const purplePale   = isDark ? PURPLE_PALE_NGT : PURPLE_PALE_DAY
  const containerW   = laps.length * BAR_WIDTH

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
            aria-label="Retour"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--bg-card2)', border: 'none',
              color: 'var(--text)', fontSize: 22, lineHeight: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>Tours</h1>
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
          <strong style={{ color: 'var(--text)' }}>Tour {activeLap + 1}</strong>
          <span style={{ color: 'var(--text-dim)' }}>·</span>
          <span style={{ color: PURPLE_ACTIVE, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {aWatts != null ? `${aWatts} W` : '—'}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>·</span>
          <span>{aZone}</span>
          {aCadDesc && (
            <>
              <span style={{ color: 'var(--text-dim)' }}>·</span>
              <span>{aCadDesc}</span>
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
            {yLabels.map(v => (
              <span key={v} style={{
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
              marginLeft: 50, overflowX: 'auto', overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div style={{ position: 'relative', width: containerW, paddingRight: 16 }}>
              {/* Container des barres + altitude */}
              <div style={{
                position: 'relative', width: containerW, height: GRAPH_HEIGHT,
                overflow: 'hidden',
              }}>
                {altPath && (
                  <svg
                    viewBox={`0 0 ${containerW} ${GRAPH_HEIGHT}`}
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                  >
                    <path d={altPath} fill={altBgColor} />
                  </svg>
                )}
                {laps.map((lap, i) => {
                  const w = lap.avg_watts ?? 0
                  const h = w > 0 ? (w / maxYW) * GRAPH_HEIGHT : 2
                  const isActive = i === activeLap
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveLap(i)}
                      style={{
                        position: 'absolute', bottom: 0,
                        left: i * BAR_WIDTH + 2,
                        width: BAR_WIDTH - 4, height: h,
                        background: isActive ? PURPLE_ACTIVE : purplePale,
                        opacity: isActive ? 0.95 : (isDark ? 0.7 : 0.85),
                        border: 'none', borderRadius: '3px 3px 0 0',
                        cursor: 'pointer', padding: 0,
                        transition: 'background 0.2s ease, opacity 0.2s ease',
                        zIndex: 1,
                      }}
                      aria-label={`Tour ${i + 1}`}
                    />
                  )
                })}
                {/* Active underline */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0, left: activeLap * BAR_WIDTH + 2,
                    width: BAR_WIDTH - 4, height: 4,
                    background: isDark ? PURPLE_PALE_NGT : PURPLE_ACTIVE,
                    borderRadius: 2,
                    transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
                    zIndex: 3, pointerEvents: 'none',
                  }}
                />
              </div>
              {/* X labels */}
              <div style={{
                position: 'relative', width: containerW, height: LABELS_H,
                background: 'var(--bg)',
              }}>
                {laps.map((_, i) => {
                  const isActive = i === activeLap
                  return (
                    <span
                      key={i}
                      style={{
                        position: 'absolute',
                        left: i * BAR_WIDTH, top: 6,
                        width: BAR_WIDTH, textAlign: 'center',
                        fontSize: isActive ? 13 : 12,
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? 'var(--text)' : 'var(--text-dim)',
                        fontVariantNumeric: 'tabular-nums',
                        transition: 'color 0.2s, font-weight 0.2s',
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
          }}>Autres tours</div>
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
                  padding: '14px 16px',
                  borderBottom: isActive ? 'none' : '1px solid var(--border)',
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
                }}>{lap.avg_watts != null ? `${Math.round(lap.avg_watts)} W` : '—'}</span>
              </button>
            )
          })}
        </div>

        {/* CTA Détails */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          display: 'flex',
        }}>
          <button
            onClick={() => setDetailsOpen(true)}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            style={{
              flex: 1,
              background: PURPLE_ACTIVE,
              color: '#fff',
              padding: 14,
              borderRadius: 12, border: 'none',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.15s ease, transform 0.1s ease',
              fontFamily: 'inherit',
            }}
            onFocus={e => { e.currentTarget.style.background = PURPLE_ACTIVE_2 }}
            onBlur={e => { e.currentTarget.style.background = PURPLE_ACTIVE }}
          >
            Détails du tour {activeLap + 1} ›
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
      />
    </>,
    document.body,
  )
}
