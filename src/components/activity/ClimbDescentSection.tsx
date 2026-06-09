'use client'

// ══════════════════════════════════════════════════════════════════
// ClimbDescentSection — Trail uniquement.
// Détection automatique des montées / descentes (≥ 400 m de D+/D−
// continu, tolérance 50 m de redescente), catégorisation Cat 4 → HC
// (D+ × pente), graphique altitude à zones colorées, résumé, liste à
// onglets, et bottom sheet de détail (8 stats) via createPortal.
// ══════════════════════════════════════════════════════════════════

import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatPace, speedMsToPace } from '@/lib/utils/pace'

interface Props {
  altitude:  number[]
  distance:  number[]        // m cumulés
  time?:     number[] | null // s (cumulés ou absolus)
  velocity?: number[] | null // m/s
  heartrate?: number[] | null
}

type Cat = 4 | 3 | 2 | 1 | 'HC'
interface ClimbSegment {
  type:      'climb' | 'descent'
  startIdx:  number
  endIdx:    number
  startKm:   number
  endKm:     number
  distance:  number   // m
  elevation: number   // m (D+ pour climb, |D−| pour descent), positif
  duration:  number   // s
  avgGrade:  number   // % (positif)
  category:  Cat
  avgPace:   number   // min/km
  avgVap:    number   // min/km
  avgHr:     number   // bpm
  avgSpeed:  number   // km/h
  vam:       number   // m/h
}

const CLIMB_COLORS:   Record<string, string> = { '4': '#fca5a5', '3': '#f87171', '2': '#ef4444', '1': '#dc2626', HC: '#991b1b' }
const DESCENT_COLORS: Record<string, string> = { '4': '#93c5fd', '3': '#60a5fa', '2': '#3b82f6', '1': '#2563eb', HC: '#1e40af' }
const segColor = (s: ClimbSegment) => (s.type === 'climb' ? CLIMB_COLORS : DESCENT_COLORS)[String(s.category)]

const MIN_ELEVATION = 400   // m
const TOLERANCE     = 50    // m

function categorize(elevation: number, avgGradePercent: number): Cat {
  const points = elevation * Math.abs(avgGradePercent)
  if (points > 24000) return 'HC'
  if (points > 12000) return 1
  if (points > 6000)  return 2
  if (points > 3000)  return 3
  return 4
}

function fmtDur(s: number): string {
  if (!isFinite(s) || s <= 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
function fmtKm(m: number): string {
  return `${(m / 1000).toFixed(2).replace('.', ',')} km`
}

function mean(arr: number[]): number {
  const v = arr.filter(x => x != null && !isNaN(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
}

export function detectSegments(
  alt: number[], dist: number[], time: number[] | null | undefined,
  vel: number[] | null | undefined, hr: number[] | null | undefined,
): ClimbSegment[] {
  const n = Math.min(alt.length, dist.length)
  if (n < 10) return []
  const t = time && time.length >= n ? time : null

  const segs: ClimbSegment[] = []
  const totalDist = dist[n - 1] - dist[0]

  function build(type: 'climb' | 'descent', sIdx: number, eIdx: number): ClimbSegment | null {
    const elevation = type === 'climb' ? alt[eIdx] - alt[sIdx] : alt[sIdx] - alt[eIdx]
    if (elevation < MIN_ELEVATION) return null
    const distance = Math.max(1, dist[eIdx] - dist[sIdx])
    const duration = t ? Math.max(1, (t[eIdx] - t[sIdx])) : Math.max(1, eIdx - sIdx)
    const avgGrade = (elevation / distance) * 100
    const avgPace  = (duration / 60) / (distance / 1000)
    const avgSpeedMs = distance / duration
    // VAP : vitesse ajustée par la pente (Minetti), affichée en allure.
    const g = (type === 'climb' ? 1 : -1) * (elevation / distance)
    const cost = 1 + g * 5.43 + g * g * 18.84
    const adjMs = avgSpeedMs * Math.max(0.5, Math.min(2.5, cost))
    const avgVap = speedMsToPace(adjMs)
    const hrSlice = hr ? hr.slice(sIdx, eIdx + 1) : []
    return {
      type, startIdx: sIdx, endIdx: eIdx,
      startKm: (dist[sIdx] - dist[0]) / 1000,
      endKm:   (dist[eIdx] - dist[0]) / 1000,
      distance, elevation, duration,
      avgGrade,
      category: categorize(elevation, avgGrade),
      avgPace, avgVap,
      avgHr: Math.round(mean(hrSlice)),
      avgSpeed: avgSpeedMs * 3.6,
      vam: Math.round(elevation / (duration / 3600)),
    }
  }
  void vel
  void totalDist

  let dir = 0          // 1 montée, -1 descente, 0 indéterminé
  let startIdx = 0
  let extIdx = 0, extAlt = alt[0]

  for (let i = 1; i < n; i++) {
    const a = alt[i]
    if (dir === 1) {
      if (a >= extAlt) { extAlt = a; extIdx = i }
      else if (extAlt - a >= TOLERANCE) {
        const s = build('climb', startIdx, extIdx); if (s) segs.push(s)
        startIdx = extIdx; dir = -1; extAlt = a; extIdx = i
      }
    } else if (dir === -1) {
      if (a <= extAlt) { extAlt = a; extIdx = i }
      else if (a - extAlt >= TOLERANCE) {
        const s = build('descent', startIdx, extIdx); if (s) segs.push(s)
        startIdx = extIdx; dir = 1; extAlt = a; extIdx = i
      }
    } else {
      if (a - alt[startIdx] >= TOLERANCE) { dir = 1; extAlt = a; extIdx = i }
      else if (alt[startIdx] - a >= TOLERANCE) { dir = -1; extAlt = a; extIdx = i }
      else { startIdx = i }   // plat : on décale le départ pour ne pas diluer
    }
  }
  if (dir === 1)  { const s = build('climb', startIdx, extIdx);   if (s) segs.push(s) }
  if (dir === -1) { const s = build('descent', startIdx, extIdx); if (s) segs.push(s) }

  return segs
}

// ── Bottom sheet détail ──────────────────────────────────────────────────────
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 9.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: color ?? 'var(--text)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function ClimbDetailSheet({ segment, index, onClose }: { segment: ClimbSegment; index: number; onClose: () => void }) {
  const [closing, setClosing] = useState(false)
  function doClose() { setClosing(true); setTimeout(onClose, 280) }
  if (typeof document === 'undefined') return null
  const color = segColor(segment)
  const isClimb = segment.type === 'climb'

  return createPortal(
    <>
      <style>{`
        @keyframes cdFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes cdFadeOut{ from{opacity:1} to{opacity:0} }
        @keyframes cdUp     { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes cdDown   { from{transform:translateY(0)} to{transform:translateY(100%)} }
      `}</style>
      <div onClick={doClose} style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(0,0,0,0.55)', animation: `${closing ? 'cdFadeOut 0.28s ease-in forwards' : 'cdFadeIn 0.3s ease-out'}` }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100,
        background: 'var(--bg)', borderRadius: '20px 20px 0 0',
        maxHeight: '80vh', overflowY: 'auto', padding: 16, paddingBottom: 28,
        boxShadow: '0 -10px 40px rgba(0,0,0,0.3)', maxWidth: 600, margin: '0 auto',
        animation: `${closing ? 'cdDown 0.28s ease-in forwards' : 'cdUp 0.3s cubic-bezier(0.4,0,0.2,1)'}`,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--text-dim)', opacity: 0.4, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ background: color, color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.04em' }}>
            {segment.category === 'HC' ? 'HC' : `CAT ${segment.category}`}
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
            {isClimb ? 'Montée' : 'Descente'} n°{index + 1}
          </span>
          <button onClick={doClose} aria-label="Fermer" style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', color: 'var(--text)', fontSize: 14, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Stat label="Distance" value={fmtKm(segment.distance)} />
          <Stat label="Durée" value={fmtDur(segment.duration)} />
          <Stat label={isClimb ? 'D+' : 'D−'} value={`${isClimb ? '+' : '−'}${Math.round(segment.elevation)} m`} color={isClimb ? '#dc2626' : '#2563eb'} />
          <Stat label="Pente moy." value={`${segment.avgGrade.toFixed(1)} %`} />
          <Stat label="Allure" value={`${formatPace(segment.avgPace)}/km`} />
          <Stat label="Allure ajustée" value={`${formatPace(segment.avgVap)}/km`} color="#7c3aed" />
          {isClimb
            ? <Stat label="VAM" value={`${segment.vam} m/h`} color="#f97316" />
            : <Stat label="Vit. moy." value={`${segment.avgSpeed.toFixed(1).replace('.', ',')} km/h`} color="#06b6d4" />}
          <Stat label="FC moy." value={segment.avgHr > 0 ? `${segment.avgHr} bpm` : '—'} color="#f97316" />
        </div>
      </div>
    </>,
    document.body,
  )
}

// ── Graphique altitude à zones colorées ──────────────────────────────────────
function ClimbGraph({ alt, dist, segments, onTap }: {
  alt: number[]; dist: number[]; segments: ClimbSegment[]; onTap: (i: number) => void
}) {
  const W = 1000, H = 120
  const n = Math.min(alt.length, dist.length)
  const d0 = dist[0], dTot = (dist[n - 1] - d0) || 1
  const xOf = (idx: number) => ((dist[idx] - d0) / dTot) * W
  const mn = Math.min(...alt.slice(0, n)), mx = Math.max(...alt.slice(0, n)), rg = (mx - mn) || 1
  const yOf = (v: number) => H - ((v - mn) / rg) * (H - 6) - 3
  const profile = `M0,${H} ` + Array.from({ length: n }, (_, i) => `L${xOf(i).toFixed(1)},${yOf(alt[i]).toFixed(1)}`).join(' ') + ` L${W},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ width: '100%', height: 130, display: 'block', touchAction: 'manipulation' }}>
      <path d={profile} fill="var(--border)" fillOpacity={0.35} />
      {segments.map((s, i) => {
        const x = xOf(s.startIdx), w = Math.max(2, xOf(s.endIdx) - xOf(s.startIdx))
        const color = segColor(s)
        return (
          <g key={i} onClick={() => onTap(i)} style={{ cursor: 'pointer' }}>
            <rect x={x} y={0} width={w} height={H} fill={color} fillOpacity={0.45} />
            {w > 26 && (
              <text x={x + w / 2} y={13} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff"
                style={{ paintOrder: 'stroke', pointerEvents: 'none' }}>
                {s.category === 'HC' ? 'HC' : s.category}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────
export function ClimbDescentSection({ altitude, distance, time, velocity, heartrate }: Props) {
  const segments = useMemo(
    () => detectSegments(altitude, distance, time, velocity, heartrate),
    [altitude, distance, time, velocity, heartrate],
  )
  const [tab, setTab] = useState<'climbs' | 'descents'>('climbs')
  const [detail, setDetail] = useState<ClimbSegment | null>(null)

  const climbs   = useMemo(() => segments.filter(s => s.type === 'climb').sort(catSort),   [segments])
  const descents = useMemo(() => segments.filter(s => s.type === 'descent').sort(catSort), [segments])

  useEffect(() => {
    if (tab === 'climbs' && climbs.length === 0 && descents.length > 0) setTab('descents')
  }, [tab, climbs.length, descents.length])

  if (segments.length === 0) return null
  const visible = tab === 'climbs' ? climbs : descents

  return (
    <div style={{ marginBottom: 32, paddingTop: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>
        Montées &amp; descentes
      </div>

      <ClimbGraph alt={altitude} dist={distance} segments={segments} onTap={i => setDetail(segments[i])} />

      {/* Légende */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', margin: '10px 0 2px', fontSize: 10, color: 'var(--text-dim)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#dc2626' }} />Montées</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#2563eb' }} />Descentes</span>
        <span>Cat 4 → HC selon D+ × pente</span>
      </div>

      {/* Résumé */}
      <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'var(--bg-card2)', borderRadius: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{climbs.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Montées</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'var(--bg-card2)', borderRadius: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>{descents.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descentes</div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', marginBottom: 10 }}>
        {([['climbs', `Montées (${climbs.length})`], ['descents', `Descentes (${descents.length})`]] as const).map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '6px 12px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11,
            fontWeight: tab === id ? 700 : 500, fontFamily: 'inherit',
            background: tab === id ? 'var(--bg-card)' : 'transparent',
            color: tab === id ? 'var(--text)' : 'var(--text-dim)',
          }}>{lbl}</button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map((s, i) => (
          <button key={`${s.startIdx}-${i}`} onClick={() => setDetail(s)} style={{
            display: 'grid', gridTemplateColumns: '34px 1fr 14px', gap: 10, alignItems: 'center',
            width: '100%', textAlign: 'left', padding: '10px 12px',
            background: 'var(--bg-card)', border: '0.5px solid var(--border)',
            borderLeft: `4px solid ${segColor(s)}`, borderRadius: 10, cursor: 'pointer',
            fontFamily: 'inherit', touchAction: 'manipulation',
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: segColor(s), textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {s.category === 'HC' ? 'HC' : s.category}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtKm(s.distance)} · {s.type === 'climb' ? '+' : '−'}{Math.round(s.elevation)} m {s.type === 'climb' ? 'D+' : 'D−'}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                {s.avgGrade.toFixed(1)} % moy. · {fmtDur(s.duration)} · {formatPace(s.avgPace)}/km
              </span>
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: 16 }}>›</span>
          </button>
        ))}
      </div>

      {detail && (
        <ClimbDetailSheet
          segment={detail}
          index={(detail.type === 'climb' ? climbs : descents).indexOf(detail)}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

function catSort(a: ClimbSegment, b: ClimbSegment): number {
  const rank = (c: Cat) => (c === 'HC' ? 5 : (5 - (c as number)))
  return rank(b.category) - rank(a.category) || b.elevation - a.elevation
}
