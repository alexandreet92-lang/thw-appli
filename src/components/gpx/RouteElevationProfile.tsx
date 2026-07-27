'use client'
// ══════════════════════════════════════════════════════════════════
// RouteElevationProfile — profil altimétrique partagé (planning + viewers).
// Rendu IDENTIQUE à la courbe « Altitude » de la fiche activité
// (src/app/activities/page.tsx, Format A stacked : silhouette remplie via
// buildAreaPath, rééchantillonnage uniforme + lissage léger façon
// src/components/record/ElevationChart.tsx) — mais en BLEU var(--primary)
// avec dégradé vertical, et légèrement plus grand (~1.3× la row fiche).
//
// Fonctions :
// - Bulle au survol : KM / Altitude / D+ cumulé / Pente locale (~200 m)
// - Overlay discret des portions séquencées (zones colorées, _startKm/_endKm)
// - Mode séquençage (bouton « + ») : drag pour sélectionner une portion,
//   bulle d'édition (km début/fin, watts, FC) + durée estimée par la
//   physique du cyclisme (bissection sur
//   P = (Crr·m·g·cosθ + m·g·sinθ)·v + ½·ρ·CdA·v³).
// ══════════════════════════════════════════════════════════════════
import { useMemo, useRef, useState, useCallback } from 'react'

export interface ProfilePoint { distKm: number; ele: number }

/** Portion déjà séquencée, dessinée en overlay discret sur le profil. */
export interface ProfilePortion {
  startKm: number
  endKm: number
  color: string
  label?: string
}

/** Résultat d'une portion sélectionnée, prêt à devenir un bloc de séance. */
export interface SequencedPortion {
  startKm: number
  endKm: number
  distanceKm: number
  dPlusM: number
  avgGradPct: number
  watts: number
  hrTarget: number | null
  estimatedMin: number
}

interface SequencingConfig {
  riderKg: number
  bikeKg?: number
  defaultWatts?: number
  onAddBlock: (p: SequencedPortion) => void
}

interface Props {
  profile: ProfilePoint[]
  totalKm?: number
  height?: number
  onHoverKm?: (km: number | null) => void
  portions?: ProfilePortion[]
  sequencing?: SequencingConfig
}

// Mêmes constantes de fidélité que la fiche activité / ElevationChart record.
const N_SAMPLES = 240
const W = 1000
const PAD_T = 4
const PAD_B = 4

// ── Physique du cyclisme : résout v (m/s) pour une puissance donnée ──
// P = (Crr·m·g·cosθ + m·g·sinθ)·v + ½·ρ·CdA·v³ — résolution par bissection.
export function solveSpeedMs(watts: number, massKg: number, gradPct: number): number {
  const g = 9.81, rho = 1.225, Crr = 0.005, CdA = 0.32
  const theta = Math.atan(gradPct / 100)
  const fRes = Crr * massKg * g * Math.cos(theta) + massKg * g * Math.sin(theta)
  const powerAt = (v: number) => fRes * v + 0.5 * rho * CdA * v * v * v
  let lo = 0.1, hi = 30
  if (powerAt(hi) <= watts) return hi
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (powerAt(mid) < watts) lo = mid; else hi = mid
  }
  // Bornes plausibles : ~2 km/h à ~90 km/h (descente)
  return Math.max(0.55, Math.min(25, (lo + hi) / 2))
}

/** Durée estimée (min) pour distKm à watts sur pente moyenne gradPct. */
export function estimatePortionMin(distKm: number, gradPct: number, watts: number, massKg: number): number {
  if (distKm <= 0 || watts <= 0) return 0
  const v = solveSpeedMs(watts, massKg, gradPct)
  return (distKm * 1000 / v) / 60
}

function fmtKm(km: number): string { return km.toFixed(1).replace('.', ',') }
function fmtEstMin(min: number): string {
  if (!isFinite(min) || min <= 0) return '—'
  const r = Math.round(min)
  if (r < 60) return `${r} min`
  return `${Math.floor(r / 60)}h${String(r % 60).padStart(2, '0')}`
}

// Rééchantillonnage à pas constant + lissage léger — même approche que la fiche.
function resampleUniform(data: ProfilePoint[], n: number): ProfilePoint[] {
  const total = data[data.length - 1].distKm
  if (data.length < 3 || total <= 0) return data
  const out: ProfilePoint[] = []
  let j = 0
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * total
    while (j < data.length - 2 && data[j + 1].distKm < d) j++
    const a = data[j], b = data[j + 1]
    const span = b.distKm - a.distKm
    const t = span > 0 ? Math.max(0, Math.min(1, (d - a.distKm) / span)) : 0
    out.push({ distKm: d, ele: a.ele + (b.ele - a.ele) * t })
  }
  return out
}
function movingAvg(data: ProfilePoint[], half: number): ProfilePoint[] {
  if (data.length < 3 || half < 1) return data
  return data.map((d, i) => {
    let sum = 0, n = 0
    for (let j = Math.max(0, i - half); j <= Math.min(data.length - 1, i + half); j++) { sum += data[j].ele; n++ }
    return { ...d, ele: sum / n }
  })
}

export default function RouteElevationProfile({ profile, totalKm, height = 92, onHoverKm, portions, sequencing }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [drag, setDrag] = useState<{ startKm: number; currentKm: number } | null>(null)
  const [pending, setPending] = useState<{ startKm: number; endKm: number } | null>(null)
  const [edgeDrag, setEdgeDrag] = useState<'start' | 'end' | null>(null)
  const [wattsStr, setWattsStr] = useState('')
  const [hrStr, setHrStr] = useState('')
  const gradIdRef = useRef(`repGrad_${Math.random().toString(36).slice(2, 8)}`)

  // Rendu fidèle : rééchantillonnage uniforme + lissage léger (façon fiche activité)
  const pts = useMemo(() => {
    if (profile.length < 3) return profile
    return movingAvg(resampleUniform(profile, N_SAMPLES), 1)
  }, [profile])

  const total = totalKm && totalKm > 0 ? totalKm : (pts.length ? pts[pts.length - 1].distKm : 0)

  // D+ cumulé (m) point par point, sur la série lissée
  const cumGain = useMemo(() => {
    const out: number[] = new Array(pts.length).fill(0)
    for (let i = 1; i < pts.length; i++) {
      const d = pts[i].ele - pts[i - 1].ele
      out[i] = out[i - 1] + (d > 0 ? d : 0)
    }
    return out
  }, [pts])

  const { minA, maxA } = useMemo(() => {
    if (pts.length === 0) return { minA: 0, maxA: 1 }
    let mn = Infinity, mx = -Infinity
    for (const p of pts) { if (p.ele < mn) mn = p.ele; if (p.ele > mx) mx = p.ele }
    return { minA: mn, maxA: mx }
  }, [pts])

  const H = height
  const inner = H - PAD_T - PAD_B
  const range = (maxA - minA) || 1
  const xOf = useCallback((km: number) => (total > 0 ? (km / total) * W : 0), [total])
  const yOf = useCallback((ele: number) => H - PAD_B - ((ele - minA) / range) * inner, [H, inner, minA, range])

  // Silhouette remplie — même construction que buildAreaPath (fiche activité)
  const areaD = useMemo(() => {
    if (pts.length < 2) return ''
    const seg = pts.map(p => `${xOf(p.distKm).toFixed(1)},${yOf(p.ele).toFixed(1)}`)
    return `M0,${H}L${seg.join('L')}L${W},${H}Z`
  }, [pts, xOf, yOf, H])

  const idxForKm = useCallback((km: number): number => {
    if (pts.length < 2 || total <= 0) return 0
    const i = Math.round((km / total) * (pts.length - 1))
    return Math.max(0, Math.min(pts.length - 1, i))
  }, [pts, total])

  // Pente locale lissée (~200 m autour du point)
  const slopeAt = useCallback((idx: number): number => {
    if (pts.length < 2 || total <= 0) return 0
    const halfKm = 0.1
    const kmAt = pts[idx].distKm
    const i0 = idxForKm(Math.max(0, kmAt - halfKm))
    const i1 = idxForKm(Math.min(total, kmAt + halfKm))
    const dd = (pts[i1].distKm - pts[i0].distKm) * 1000
    if (dd <= 0) return 0
    return ((pts[i1].ele - pts[i0].ele) / dd) * 100
  }, [pts, total, idxForKm])

  const kmAtClientX = useCallback((clientX: number): number => {
    const svg = svgRef.current
    if (!svg || total <= 0) return 0
    const rect = svg.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(frac * total * 10) / 10
  }, [total])

  // Stats d'une portion (distance, D+, pente moyenne)
  const portionStats = useCallback((s: number, e: number) => {
    const a = Math.min(s, e), b = Math.max(s, e)
    const i0 = idxForKm(a), i1 = idxForKm(b)
    let dPlus = 0
    for (let i = i0 + 1; i <= i1; i++) {
      const d = pts[i].ele - pts[i - 1].ele
      if (d > 0) dPlus += d
    }
    const distanceKm = Math.max(0.01, b - a)
    const avgGradPct = ((pts[i1]?.ele ?? 0) - (pts[i0]?.ele ?? 0)) / (distanceKm * 1000) * 100
    return { distanceKm, dPlusM: Math.round(dPlus), avgGradPct: Math.round(avgGradPct * 10) / 10 }
  }, [pts, idxForKm])

  const massKg = (sequencing?.riderKg ?? 75) + (sequencing?.bikeKg ?? 8)
  const pendingWatts = parseInt(wattsStr) || 0
  const pendingStats = pending ? portionStats(pending.startKm, pending.endKm) : null
  const pendingEstMin = pending && pendingStats && pendingWatts > 0
    ? estimatePortionMin(pendingStats.distanceKm, pendingStats.avgGradPct, pendingWatts, massKg)
    : 0

  function openPending(s: number, e: number) {
    const a = Math.min(s, e), b = Math.max(s, e)
    setPending({ startKm: a, endKm: b })
    if (!wattsStr) setWattsStr(String(sequencing?.defaultWatts ?? 200))
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const km = kmAtClientX(e.clientX)
    if (edgeDrag && pending) {
      setPending(p => p ? (edgeDrag === 'start'
        ? { ...p, startKm: Math.min(km, p.endKm - 0.1) }
        : { ...p, endKm: Math.max(km, p.startKm + 0.1) }) : p)
      return
    }
    if (drag) { setDrag(d => d ? { ...d, currentKm: km } : d); return }
    const idx = idxForKm(km)
    setHoverIdx(idx)
    onHoverKm?.(pts[idx]?.distKm ?? null)
  }
  function handleLeave() {
    setHoverIdx(null)
    onHoverKm?.(null)
    if (drag) setDrag(null)
    setEdgeDrag(null)
  }
  function handleDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!selectMode || pending) return
    e.preventDefault()
    const km = kmAtClientX(e.clientX)
    setDrag({ startKm: km, currentKm: km })
  }
  function handleUp() {
    if (edgeDrag) { setEdgeDrag(null); return }
    if (drag) {
      const a = Math.min(drag.startKm, drag.currentKm)
      const b = Math.max(drag.startKm, drag.currentKm)
      setDrag(null)
      if (b - a >= 0.2) openPending(a, b)
    }
  }

  function addPendingBlock() {
    if (!pending || !pendingStats || !sequencing || pendingWatts <= 0) return
    sequencing.onAddBlock({
      startKm: pending.startKm,
      endKm: pending.endKm,
      distanceKm: Math.round(pendingStats.distanceKm * 10) / 10,
      dPlusM: pendingStats.dPlusM,
      avgGradPct: pendingStats.avgGradPct,
      watts: pendingWatts,
      hrTarget: parseInt(hrStr) > 0 ? parseInt(hrStr) : null,
      estimatedMin: pendingEstMin,
    })
    setPending(null)
    setHrStr('')
  }

  if (pts.length < 2 || total <= 0) return null

  const hp = hoverIdx !== null ? pts[hoverIdx] : null
  const hoverX = hp ? xOf(hp.distKm) : 0
  const hoverFracPct = (hoverX / W) * 100
  const gradId = gradIdRef.current

  // Sélection en cours (drag) ou en édition (pending)
  const sel = pending ?? (drag ? { startKm: Math.min(drag.startKm, drag.currentKm), endKm: Math.max(drag.startKm, drag.currentKm) } : null)

  const inputStyle: React.CSSProperties = {
    width: 56, padding: '5px 6px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12, outline: 'none',
    fontVariantNumeric: 'tabular-nums',
  }
  const miniLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--text-dim)', display: 'block', marginBottom: 3,
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Bouton « + » — mode séquençage */}
      {sequencing && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 }}>
          {selectMode && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Glisse sur le profil pour sélectionner une portion</span>
          )}
          <button
            type="button"
            onClick={() => { setSelectMode(v => !v); setPending(null); setDrag(null) }}
            title={selectMode ? 'Quitter le mode séquençage' : 'Séquencer une portion du parcours'}
            aria-label="Séquencer le parcours"
            style={{
              width: 26, height: 26, borderRadius: 8, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: selectMode ? 'var(--primary-dim)' : 'transparent',
              color: selectMode ? 'var(--primary)' : 'var(--text-mid)',
              fontSize: 15, fontWeight: 600, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {selectMode ? '✕' : '+'}
          </button>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: H, display: 'block', cursor: selectMode ? 'crosshair' : 'default', touchAction: 'none' }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onMouseDown={handleDown}
        onMouseUp={handleUp}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary, #06B6D4)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--primary, #06B6D4)" stopOpacity={0.08} />
          </linearGradient>
        </defs>

        {/* Silhouette remplie — même rendu que la courbe Altitude de la fiche activité */}
        <path d={areaD} fill={`url(#${gradId})`} strokeLinejoin="round" />

        {/* Overlay discret des portions séquencées */}
        {(portions ?? []).map((p, i) => {
          const x1 = xOf(Math.max(0, p.startKm))
          const x2 = xOf(Math.min(total, p.endKm))
          if (!(x2 > x1)) return null
          return (
            <g key={`po${i}`}>
              <rect x={x1} y={0} width={x2 - x1} height={H} fill={p.color} opacity={0.14} />
              <line x1={x1} y1={0} x2={x2} y2={0} stroke={p.color} strokeWidth={2.5} opacity={0.8} />
            </g>
          )
        })}

        {/* Sélection (drag / pending) — zone bleu translucide + poignées */}
        {sel && (() => {
          const x1 = xOf(sel.startKm), x2 = xOf(sel.endKm)
          return (
            <g>
              <rect x={x1} y={0} width={Math.max(1, x2 - x1)} height={H} fill="var(--primary, #06B6D4)" opacity={0.16} />
              <line x1={x1} y1={0} x2={x1} y2={H} stroke="var(--primary, #06B6D4)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <line x1={x2} y1={0} x2={x2} y2={H} stroke="var(--primary, #06B6D4)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              {pending && (
                <>
                  <rect x={x1 - 7} y={H / 2 - 12} width={14} height={24} rx={5} fill="var(--primary, #06B6D4)"
                    style={{ cursor: 'ew-resize' }}
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setEdgeDrag('start') }} />
                  <rect x={x2 - 7} y={H / 2 - 12} width={14} height={24} rx={5} fill="var(--primary, #06B6D4)"
                    style={{ cursor: 'ew-resize' }}
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setEdgeDrag('end') }} />
                </>
              )}
            </g>
          )
        })()}

        {/* Ligne verticale repère au survol */}
        {hp && !sel && (
          <>
            <line x1={hoverX} y1={0} x2={hoverX} y2={H} stroke="var(--primary, #06B6D4)" strokeWidth={1.2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <circle cx={hoverX} cy={yOf(hp.ele)} r={4} fill="var(--primary, #06B6D4)" stroke="var(--bg-card, #fff)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>

      {/* Axe km en bas — même principe que la fiche activité */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '4px 2px 0',
        fontSize: 9, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums',
      }}>
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <span key={pct}>{(pct * total).toFixed(1)}km</span>
        ))}
      </div>

      {/* Bulle de survol : KM / Altitude / D+ cumulé / Pente */}
      {hp && hoverIdx !== null && !sel && (
        <div style={{
          position: 'absolute', top: sequencing ? 34 : 2,
          left: `${Math.max(9, Math.min(91, hoverFracPct))}%`,
          transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '7px 10px', pointerEvents: 'none',
          whiteSpace: 'nowrap', zIndex: 30, boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.45,
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>KM {fmtKm(hp.distKm)}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-mid)' }}>Altitude <strong style={{ color: 'var(--text)' }}>{Math.round(hp.ele)} m</strong></p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-mid)' }}>D+ cumulé <strong style={{ color: 'var(--text)' }}>{Math.round(cumGain[hoverIdx])} m</strong></p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-mid)' }}>Pente <strong style={{ color: 'var(--text)' }}>{slopeAt(hoverIdx).toFixed(1).replace('.', ',')} %</strong></p>
        </div>
      )}

      {/* Bulle de séquençage — édition de la portion sélectionnée */}
      {pending && pendingStats && sequencing && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: sequencing ? 34 : 4,
            left: `${Math.max(20, Math.min(80, ((xOf(pending.startKm) + xOf(pending.endKm)) / 2 / W) * 100))}%`,
            transform: 'translateX(-50%)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 14px', zIndex: 40, minWidth: 240,
            boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Portion du parcours</span>
            <button type="button" onClick={() => setPending(null)} aria-label="Fermer"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, padding: 2, lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div>
              <span style={miniLabel}>KM début</span>
              <input type="number" step={0.1} min={0} max={pending.endKm - 0.1} value={pending.startKm}
                onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setPending(p => p ? { ...p, startKm: Math.max(0, Math.min(v, p.endKm - 0.1)) } : p) }}
                style={inputStyle} />
            </div>
            <div>
              <span style={miniLabel}>KM fin</span>
              <input type="number" step={0.1} min={pending.startKm + 0.1} max={total} value={pending.endKm}
                onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setPending(p => p ? { ...p, endKm: Math.min(total, Math.max(v, p.startKm + 0.1)) } : p) }}
                style={inputStyle} />
            </div>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
            {fmtKm(pendingStats.distanceKm)} km · {pendingStats.dPlusM} m D+ · {pendingStats.avgGradPct.toFixed(1).replace('.', ',')} %
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div>
              <span style={miniLabel}>Watts cibles</span>
              <input type="number" step={5} min={0} value={wattsStr}
                onChange={e => setWattsStr(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <span style={miniLabel}>FC cible</span>
              <input type="number" step={1} min={0} value={hrStr} placeholder="bpm"
                onChange={e => setHrStr(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-mid)' }}>
            Durée estimée <strong style={{ fontSize: 14, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtEstMin(pendingEstMin)}</strong>
          </p>
          <button type="button" onClick={addPendingBlock} disabled={pendingWatts <= 0}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', cursor: pendingWatts > 0 ? 'pointer' : 'default',
              background: 'var(--primary, #06B6D4)', color: 'var(--on-primary, #fff)', fontSize: 12, fontWeight: 700,
              opacity: pendingWatts > 0 ? 1 : 0.5,
            }}>
            Ajouter le bloc
          </button>
        </div>
      )}
    </div>
  )
}
