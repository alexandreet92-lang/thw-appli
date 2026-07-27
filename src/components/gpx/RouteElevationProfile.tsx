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
// - Bulle au survol (affichée À DROITE du curseur) : KM / Altitude /
//   D+ cumulé / Pente locale (~200 m)
// - Overlay des portions séquencées (zones colorées, _startKm/_endKm),
//   CLIQUABLES pour ré-éditer le bloc correspondant
// - Mode séquençage : « + » (bloc simple) ou « Fractionné » (alternances
//   effort/récup dessinées en bandes) → drag pour sélectionner une portion,
//   bulle d'édition (km début/fin, watts, FC, params de fractionné) + durée
//   estimée par la physique du cyclisme (cf. src/lib/gpx/elevation.ts).
//
// ⚠ D+ : TOUS les cumuls sont calculés sur la série d'altitude BRUTE
// (prop `profile`, tous les points du fichier) via src/lib/gpx/elevation.ts,
// avec le même algorithme qu'à l'import. La série rééchantillonnée + lissée
// ci-dessous ne sert QU'AU DESSIN et à la pente locale : elle écrase les
// petites bosses et sous-estime le D+ de ~45 %.
// ══════════════════════════════════════════════════════════════════
import { useMemo, useRef, useState, useCallback } from 'react'
import {
  cumulativeGain, gainAtKm, gainBetween, eleAtKm, estimateRangeMin,
  solveSpeedMs as solveSpeedMsLib, estimatePortionMin as estimatePortionMinLib,
  type ElePoint,
} from '@/lib/gpx/elevation'

export type ProfilePoint = ElePoint

/** Paramètres d'un fractionné porté par une portion. */
export interface PortionInterval {
  reps: number
  effortSec: number
  recoverySec: number
  effortWatts: number
  recoveryWatts: number
}

/** Portion déjà séquencée, dessinée en overlay sur le profil. */
export interface ProfilePortion {
  /** id du bloc correspondant — présent = portion ré-éditable au clic. */
  id?: string
  startKm: number
  endKm: number
  color: string
  label?: string
  /** Valeurs pré-remplies à la ré-ouverture de la bulle. */
  watts?: number
  hrTarget?: number | null
  interval?: PortionInterval
  /** Couleur des bandes de récup d'un fractionné. */
  recoveryColor?: string
  /** Surligne la portion en rouge sur la carte du parcours. */
  highlight?: boolean
}

/** Résultat d'une portion sélectionnée, prêt à devenir un bloc de séance. */
export interface SequencedPortion {
  /** Défini si l'utilisateur ré-édite un bloc existant. */
  id?: string
  startKm: number
  endKm: number
  distanceKm: number
  dPlusM: number
  avgGradPct: number
  watts: number
  hrTarget: number | null
  estimatedMin: number
  interval?: PortionInterval
}

export interface SequencingConfig {
  riderKg: number
  bikeKg?: number
  defaultWatts?: number
  /** Watts d'effort par défaut d'un fractionné (typiquement ~seuil). */
  intervalWatts?: number
  /** Watts de récup par défaut d'un fractionné (typiquement le fond Z2). */
  recoveryWatts?: number
  onAddBlock: (p: SequencedPortion) => void
  /** Ré-édition d'une portion existante (p.id renseigné). */
  onUpdateBlock?: (p: SequencedPortion) => void
  onRemoveBlock?: (id: string) => void
  /** Couleur de zone pour une puissance — dessin des bandes de fractionné. */
  colorForWatts?: (w: number) => string
}

interface Props {
  profile: ProfilePoint[]
  totalKm?: number
  /** D+ total (m) des stats du parcours — cale le cumul affiché dessus. */
  totalGainM?: number | null
  height?: number
  onHoverKm?: (km: number | null) => void
  portions?: ProfilePortion[]
  sequencing?: SequencingConfig
  /** Rendu compact non interactif (popover de survol du planning). */
  staticMode?: boolean
  /** Masque l'axe des km (rendu très compact). */
  hideAxis?: boolean
}

// Mêmes constantes de fidélité que la fiche activité / ElevationChart record.
const N_SAMPLES = 240
const W = 1000
const PAD_T = 4
const PAD_B = 4
const BUBBLE_W = 152      // largeur estimée de la bulle de survol (px)
const CURSOR_GAP = 14     // décalage demandé : la bulle ne masque pas le profil

// Ré-exports historiques (l'implémentation vit dans src/lib/gpx/elevation.ts).
export const solveSpeedMs = solveSpeedMsLib
export const estimatePortionMin = estimatePortionMinLib

function fmtKm(km: number): string { return km.toFixed(1).replace('.', ',') }
function fmtEstMin(min: number): string {
  if (!isFinite(min) || min <= 0) return '—'
  const r = Math.round(min)
  if (r < 60) return `${r} min`
  return `${Math.floor(r / 60)}h${String(r % 60).padStart(2, '0')}`
}
function mmssToSec(s: string): number {
  const m = (s || '').trim().match(/^(\d+)\s*:\s*(\d{1,2})$/)
  if (m) return (+m[1]) * 60 + (+m[2])
  const n = parseFloat(s)
  return isNaN(n) ? 0 : Math.round(n * 60)
}
function secToMmss(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Bandes effort/récup d'un fractionné réparties sur [startKm, endKm]. */
export function intervalBands(
  startKm: number, endKm: number, iv: PortionInterval,
): { a: number; b: number; recovery: boolean }[] {
  const reps = Math.max(1, Math.min(60, Math.round(iv.reps || 1)))
  const eff = Math.max(1, iv.effortSec || 1)
  const rec = Math.max(0, iv.recoverySec || 0)
  const cycle = eff + rec
  const span = endKm - startKm
  if (span <= 0 || cycle <= 0) return []
  const unit = span / (reps * cycle)
  const out: { a: number; b: number; recovery: boolean }[] = []
  for (let r = 0; r < reps; r++) {
    const a = startKm + r * cycle * unit
    const mid = a + eff * unit
    out.push({ a, b: mid, recovery: false })
    if (rec > 0) out.push({ a: mid, b: a + cycle * unit, recovery: true })
  }
  return out
}

// Rééchantillonnage à pas constant + lissage léger — DESSIN UNIQUEMENT.
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

export default function RouteElevationProfile({
  profile, totalKm, totalGainM, height = 92, onHoverKm, portions, sequencing,
  staticMode = false, hideAxis = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [boxW, setBoxW] = useState(600)
  const [hoverKm, setHoverKm] = useState<number | null>(null)
  const [selectMode, setSelectMode] = useState<null | 'simple' | 'interval'>(null)
  const [drag, setDrag] = useState<{ startKm: number; currentKm: number } | null>(null)
  const [pending, setPending] = useState<{ startKm: number; endKm: number; id?: string; interval: boolean } | null>(null)
  const [edgeDrag, setEdgeDrag] = useState<'start' | 'end' | null>(null)
  const [wattsStr, setWattsStr] = useState('')
  const [hrStr, setHrStr] = useState('')
  const [effortStr, setEffortStr] = useState('2:00')
  const [recupStr, setRecupStr] = useState('2:00')
  const [wEffStr, setWEffStr] = useState('')
  const [wRecStr, setWRecStr] = useState('')
  const [repsStr, setRepsStr] = useState('5')
  const gradIdRef = useRef(`repGrad_${Math.random().toString(36).slice(2, 8)}`)

  const interactive = !staticMode

  // Rendu fidèle : rééchantillonnage uniforme + lissage léger (façon fiche activité)
  const pts = useMemo(() => {
    if (profile.length < 3) return profile
    return movingAvg(resampleUniform(profile, N_SAMPLES), 1)
  }, [profile])

  const total = totalKm && totalKm > 0 ? totalKm : (pts.length ? pts[pts.length - 1].distKm : 0)

  // ── D+ : cumul sur la série BRUTE (jamais sur pts, qui est lissée) ──
  const cumRaw = useMemo(() => cumulativeGain(profile), [profile])
  const rawTotalGain = cumRaw.length ? cumRaw[cumRaw.length - 1] : 0
  // Cale le cumul sur le D+ des stats quand il est connu (le profil stocké en
  // base est décimé tous les 200 m → il perd une part du D+ brut).
  const gainScale = totalGainM && totalGainM > 0 && rawTotalGain > 0 ? totalGainM / rawTotalGain : 1
  const gainAt = useCallback((km: number) => gainAtKm(profile, cumRaw, km) * gainScale, [profile, cumRaw, gainScale])
  const gainOn = useCallback((a: number, b: number) => gainBetween(profile, cumRaw, a, b) * gainScale, [profile, cumRaw, gainScale])

  const { minA, maxA } = useMemo(() => {
    if (pts.length === 0) return { minA: 0, maxA: 1 }
    let mn = Infinity, mx = -Infinity
    for (const p of pts) { if (p.ele < mn) mn = p.ele; if (p.ele > mx) mx = p.ele }
    return { minA: mn, maxA: mx }
  }, [pts])

  const H = height
  const inner = H - PAD_T - PAD_B
  // Hauteur du bandeau de zone coloré en tête de chaque portion (unités viewBox).
  const ribbonH = Math.max(4, H * 0.16)
  const range = (maxA - minA) || 1
  const xOf = useCallback((km: number) => (total > 0 ? (km / total) * W : 0), [total])
  const yOf = useCallback((ele: number) => H - PAD_B - ((ele - minA) / range) * inner, [H, inner, minA, range])

  // Silhouette remplie — même construction que buildAreaPath (fiche activité)
  const areaD = useMemo(() => {
    if (pts.length < 2) return ''
    const seg = pts.map(p => `${xOf(p.distKm).toFixed(1)},${yOf(p.ele).toFixed(1)}`)
    return `M0,${H}L${seg.join('L')}L${W},${H}Z`
  }, [pts, xOf, yOf, H])

  // Pente locale lissée (~200 m autour du point) — affichage seulement.
  const slopeAt = useCallback((km: number): number => {
    if (pts.length < 2 || total <= 0) return 0
    const halfKm = 0.1
    const a = Math.max(0, km - halfKm), b = Math.min(total, km + halfKm)
    const dd = (b - a) * 1000
    if (dd <= 0) return 0
    return ((eleAtKm(pts, b) - eleAtKm(pts, a)) / dd) * 100
  }, [pts, total])

  const kmAtClientX = useCallback((clientX: number): number => {
    const svg = svgRef.current
    if (!svg || total <= 0) return 0
    const rect = svg.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(frac * total * 10) / 10
  }, [total])

  // Stats d'une portion (distance, D+ BRUT, pente moyenne)
  const portionStats = useCallback((s: number, e: number) => {
    const a = Math.min(s, e), b = Math.max(s, e)
    const distanceKm = Math.max(0.01, b - a)
    const avgGradPct = ((eleAtKm(profile, b) - eleAtKm(profile, a)) / (distanceKm * 1000)) * 100
    return {
      distanceKm,
      dPlusM: Math.round(gainOn(a, b)),
      avgGradPct: Math.round(avgGradPct * 10) / 10,
    }
  }, [profile, gainOn])

  const massKg = (sequencing?.riderKg ?? 75) + (sequencing?.bikeKg ?? 8)
  const defW = sequencing?.defaultWatts ?? 200
  const effW = sequencing?.intervalWatts ?? Math.round(defW * 1.4 / 5) * 5
  const recW = sequencing?.recoveryWatts ?? Math.round(defW * 0.85 / 5) * 5
  const pendingIsInterval = pending?.interval ?? false
  const pendingWatts = pendingIsInterval ? (parseInt(wEffStr) || 0) : (parseInt(wattsStr) || 0)
  const pendingStats = pending ? portionStats(pending.startKm, pending.endKm) : null
  // Actif aussi PENDANT le drag en mode « Fractionné » : la portion se dessine
  // directement en alternances effort/récup, avant même l'ouverture de la bulle.
  const ivActive = pendingIsInterval || (!pending && selectMode === 'interval')
  const pendingIv: PortionInterval | null = ivActive ? {
    reps: Math.max(1, parseInt(repsStr) || 1),
    effortSec: mmssToSec(effortStr),
    recoverySec: mmssToSec(recupStr),
    effortWatts: parseInt(wEffStr) || effW,
    recoveryWatts: parseInt(wRecStr) || recW,
  } : null
  const pendingEstMin = pending && pendingStats
    ? (pendingIv
      ? (pendingIv.reps * (pendingIv.effortSec + pendingIv.recoverySec)) / 60
      : (pendingWatts > 0 ? estimateRangeMin(profile, pending.startKm, pending.endKm, pendingWatts, massKg) : 0))
    : 0

  function openPending(s: number, e: number, interval: boolean) {
    const a = Math.min(s, e), b = Math.max(s, e)
    setPending({ startKm: a, endKm: b, interval })
    if (!wattsStr) setWattsStr(String(defW))
    if (!wEffStr) setWEffStr(String(effW))
    if (!wRecStr) setWRecStr(String(recW))
  }

  /** Ré-ouverture d'une portion existante, pré-remplie (point 4). */
  function openExisting(p: ProfilePortion) {
    if (!sequencing || !p.id || staticMode) return
    setDrag(null)
    setSelectMode(null)
    setPending({ startKm: p.startKm, endKm: p.endKm, id: p.id, interval: !!p.interval })
    setHrStr(p.hrTarget != null ? String(p.hrTarget) : '')
    if (p.interval) {
      setRepsStr(String(p.interval.reps))
      setEffortStr(secToMmss(p.interval.effortSec))
      setRecupStr(secToMmss(p.interval.recoverySec))
      setWEffStr(String(p.interval.effortWatts))
      setWRecStr(String(p.interval.recoveryWatts))
    } else {
      setWattsStr(String(p.watts ?? defW))
    }
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!interactive) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect && Math.abs(rect.width - boxW) > 1) setBoxW(rect.width)
    const km = kmAtClientX(e.clientX)
    if (edgeDrag && pending) {
      setPending(p => p ? (edgeDrag === 'start'
        ? { ...p, startKm: Math.min(km, p.endKm - 0.1) }
        : { ...p, endKm: Math.max(km, p.startKm + 0.1) }) : p)
      return
    }
    if (drag) { setDrag(d => d ? { ...d, currentKm: km } : d); return }
    setHoverKm(km)
    onHoverKm?.(km)
  }
  function handleLeave() {
    setHoverKm(null)
    onHoverKm?.(null)
    if (drag) setDrag(null)
    setEdgeDrag(null)
  }
  function handleDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!selectMode || pending || !interactive) return
    e.preventDefault()
    const km = kmAtClientX(e.clientX)
    setDrag({ startKm: km, currentKm: km })
  }
  function handleUp() {
    if (edgeDrag) { setEdgeDrag(null); return }
    if (drag) {
      const a = Math.min(drag.startKm, drag.currentKm)
      const b = Math.max(drag.startKm, drag.currentKm)
      const mode = selectMode
      setDrag(null)
      if (b - a >= 0.2 && mode) openPending(a, b, mode === 'interval')
    }
  }

  function submitPending() {
    if (!pending || !pendingStats || !sequencing || pendingWatts <= 0) return
    const payload: SequencedPortion = {
      id: pending.id,
      startKm: pending.startKm,
      endKm: pending.endKm,
      distanceKm: Math.round(pendingStats.distanceKm * 10) / 10,
      dPlusM: pendingStats.dPlusM,
      avgGradPct: pendingStats.avgGradPct,
      watts: pendingWatts,
      hrTarget: parseInt(hrStr) > 0 ? parseInt(hrStr) : null,
      estimatedMin: pendingEstMin,
      interval: pendingIv ?? undefined,
    }
    if (pending.id && sequencing.onUpdateBlock) sequencing.onUpdateBlock(payload)
    else sequencing.onAddBlock(payload)
    setPending(null)
    setHrStr('')
  }
  function removePending() {
    if (pending?.id && sequencing?.onRemoveBlock) sequencing.onRemoveBlock(pending.id)
    setPending(null)
    setHrStr('')
  }

  if (pts.length < 2 || total <= 0) return null

  const hoverEle = hoverKm != null ? eleAtKm(pts, hoverKm) : 0
  const hoverX = hoverKm != null ? xOf(hoverKm) : 0
  const gradId = gradIdRef.current

  // Sélection en cours (drag) ou en édition (pending)
  const sel = pending ?? (drag ? { startKm: Math.min(drag.startKm, drag.currentKm), endKm: Math.max(drag.startKm, drag.currentKm), interval: selectMode === 'interval' } : null)
  const selBands = sel && sel.interval && pendingIv ? intervalBands(sel.startKm, sel.endKm, pendingIv) : null
  const colorFor = sequencing?.colorForWatts

  // Bulle de survol : à DROITE du curseur, bascule à gauche si ça déborde.
  const hoverPx = (hoverX / W) * boxW
  const flipLeft = hoverPx + CURSOR_GAP + BUBBLE_W > boxW

  const inputStyle: React.CSSProperties = {
    width: 56, padding: '5px 6px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12, outline: 'none',
    fontVariantNumeric: 'tabular-nums',
  }
  const miniLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--text-dim)', display: 'block', marginBottom: 3,
  }
  const seqBtn = (active: boolean): React.CSSProperties => ({
    height: 26, padding: '0 9px', borderRadius: 8, cursor: 'pointer',
    border: '1px solid var(--border)',
    background: active ? 'var(--primary-dim)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-mid)',
    fontSize: 11, fontWeight: 600, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  })

  const showSeqUi = !!sequencing && interactive

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Boutons de séquençage : bloc simple « + » et « Fractionné » */}
      {showSeqUi && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 }}>
          {selectMode && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Glisse sur le profil pour sélectionner une portion</span>
          )}
          <button
            type="button"
            onClick={() => { setSelectMode(v => v === 'simple' ? null : 'simple'); setPending(null); setDrag(null) }}
            title={selectMode === 'simple' ? 'Quitter le mode séquençage' : 'Séquencer une portion du parcours'}
            aria-label="Séquencer le parcours"
            style={{ ...seqBtn(selectMode === 'simple'), width: 26, padding: 0, fontSize: 15, fontWeight: 600 }}>
            {selectMode === 'simple' ? '✕' : '+'}
          </button>
          <button
            type="button"
            onClick={() => { setSelectMode(v => v === 'interval' ? null : 'interval'); setPending(null); setDrag(null) }}
            title="Séquencer un fractionné sur une portion"
            aria-label="Fractionné"
            style={seqBtn(selectMode === 'interval')}>
            {selectMode === 'interval' ? '✕ Fractionné' : 'Fractionné'}
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

        {/* Overlay des portions séquencées — cliquables pour ré-édition */}
        {(portions ?? []).map((p, i) => {
          const x1 = xOf(Math.max(0, p.startKm))
          const x2 = xOf(Math.min(total, p.endKm))
          if (!(x2 > x1)) return null
          const clickable = interactive && !!p.id && !!sequencing
          const bands = p.interval ? intervalBands(p.startKm, p.endKm, p.interval) : null
          return (
            <g key={p.id ?? `po${i}`}
              onClick={clickable ? () => openExisting(p) : undefined}
              // Le clic sur une portion existante prime sur le drag-to-select :
              // sans ça, le mousedown démarrerait une sélection et masquerait le clic.
              onMouseDown={clickable ? (e => e.stopPropagation()) : undefined}
              style={clickable ? { cursor: 'pointer' } : undefined}>
              {bands
                ? bands.map((b, k) => {
                  const bx1 = xOf(b.a), bx2 = xOf(b.b)
                  const bw = Math.max(0.6, bx2 - bx1)
                  const col = b.recovery ? (p.recoveryColor ?? p.color) : p.color
                  return (
                    <g key={`bd${k}`}>
                      {/* voile de zone sur toute la hauteur */}
                      <rect x={bx1} y={0} width={bw} height={H} fill={col} opacity={b.recovery ? 0.20 : 0.38} />
                      {/* bandeau de zone marqué en haut de la portion */}
                      <rect x={bx1} y={0} width={bw} height={ribbonH} fill={col} opacity={b.recovery ? 0.55 : 1} />
                    </g>
                  )
                })
                : (
                  <>
                    {/* voile de zone sur toute la hauteur */}
                    <rect x={x1} y={0} width={x2 - x1} height={H} fill={p.color} opacity={0.24} />
                    {/* bandeau de zone marqué en haut — bien visible, coloré */}
                    <rect x={x1} y={0} width={x2 - x1} height={ribbonH} fill={p.color} opacity={0.96} />
                    {/* liseré latéral pour délimiter la portion */}
                    <line x1={x1} y1={0} x2={x1} y2={H} stroke={p.color} strokeWidth={1} opacity={0.5} vectorEffect="non-scaling-stroke" />
                    <line x1={x2} y1={0} x2={x2} y2={H} stroke={p.color} strokeWidth={1} opacity={0.5} vectorEffect="non-scaling-stroke" />
                  </>
                )}
            </g>
          )
        })}

        {/* Sélection (drag / pending) — zone bleu translucide + poignées */}
        {sel && (() => {
          const x1 = xOf(sel.startKm), x2 = xOf(sel.endKm)
          return (
            <g>
              {selBands
                ? selBands.map((b, k) => {
                  const bx1 = xOf(b.a), bx2 = xOf(b.b)
                  const col = colorFor
                    ? colorFor(b.recovery ? (pendingIv?.recoveryWatts ?? 0) : (pendingIv?.effortWatts ?? 0))
                    : 'var(--primary, #06B6D4)'
                  return <rect key={`sb${k}`} x={bx1} y={0} width={Math.max(0.6, bx2 - bx1)} height={H} fill={col} opacity={b.recovery ? 0.12 : 0.34} />
                })
                : <rect x={x1} y={0} width={Math.max(1, x2 - x1)} height={H} fill="var(--primary, #06B6D4)" opacity={0.16} />}
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
        {hoverKm != null && !sel && (
          // pointerEvents none : le repère ne doit jamais intercepter le clic
          // destiné à une portion séquencée sous le curseur.
          <g style={{ pointerEvents: 'none' }}>
            <line x1={hoverX} y1={0} x2={hoverX} y2={H} stroke="var(--primary, #06B6D4)" strokeWidth={1.2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <circle cx={hoverX} cy={yOf(hoverEle)} r={4} fill="var(--primary, #06B6D4)" stroke="var(--bg-card, #fff)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>

      {/* Axe km en bas — même principe que la fiche activité */}
      {!hideAxis && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', padding: '4px 2px 0',
          fontSize: 9, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums',
        }}>
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <span key={pct}>{(pct * total).toFixed(1)}km</span>
          ))}
        </div>
      )}

      {/* Bulle de survol : KM / Altitude / D+ cumulé / Pente — À DROITE du curseur */}
      {hoverKm != null && !sel && (
        <div data-testid="elev-hover-bubble" style={{
          position: 'absolute', top: showSeqUi ? 34 : 2,
          left: hoverPx + (flipLeft ? -CURSOR_GAP : CURSOR_GAP),
          transform: flipLeft ? 'translateX(-100%)' : 'none',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '7px 10px', pointerEvents: 'none',
          whiteSpace: 'nowrap', zIndex: 30, boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.45,
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>KM {fmtKm(hoverKm)}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-mid)' }}>Altitude <strong style={{ color: 'var(--text)' }}>{Math.round(eleAtKm(profile, hoverKm))} m</strong></p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-mid)' }}>D+ cumulé <strong data-testid="elev-cum-gain" style={{ color: 'var(--text)' }}>{Math.round(gainAt(hoverKm))} m</strong></p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-mid)' }}>Pente <strong style={{ color: 'var(--text)' }}>{slopeAt(hoverKm).toFixed(1).replace('.', ',')} %</strong></p>
        </div>
      )}

      {/* Bulle de séquençage — édition / ré-édition de la portion */}
      {pending && pendingStats && sequencing && interactive && (
        <div
          data-testid="seq-bubble"
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: showSeqUi ? 34 : 4,
            left: `${Math.max(20, Math.min(80, ((xOf(pending.startKm) + xOf(pending.endKm)) / 2 / W) * 100))}%`,
            transform: 'translateX(-50%)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 14px', zIndex: 40, minWidth: 240,
            boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
              {pendingIsInterval ? 'Fractionné sur le parcours' : 'Portion du parcours'}
            </span>
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

          {pendingIsInterval ? (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div>
                  <span style={miniLabel}>Effort</span>
                  <input type="text" inputMode="numeric" value={effortStr} placeholder="mm:ss"
                    onChange={e => setEffortStr(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <span style={miniLabel}>Récup</span>
                  <input type="text" inputMode="numeric" value={recupStr} placeholder="mm:ss"
                    onChange={e => setRecupStr(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <span style={miniLabel}>Reps</span>
                  <input type="number" step={1} min={1} max={60} value={repsStr}
                    onChange={e => setRepsStr(e.target.value)} style={{ ...inputStyle, width: 46 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div>
                  <span style={miniLabel}>Watts effort</span>
                  <input type="number" step={5} min={0} value={wEffStr}
                    onChange={e => setWEffStr(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <span style={miniLabel}>Watts récup</span>
                  <input type="number" step={5} min={0} value={wRecStr}
                    onChange={e => setWRecStr(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <span style={miniLabel}>FC cible</span>
                  <input type="number" step={1} min={0} value={hrStr} placeholder="bpm"
                    onChange={e => setHrStr(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </>
          ) : (
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
          )}

          <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-mid)' }}>
            Durée estimée <strong style={{ fontSize: 14, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtEstMin(pendingEstMin)}</strong>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={submitPending} disabled={pendingWatts <= 0}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: pendingWatts > 0 ? 'pointer' : 'default',
                background: 'var(--primary, #06B6D4)', color: 'var(--on-primary, #fff)', fontSize: 12, fontWeight: 700,
                opacity: pendingWatts > 0 ? 1 : 0.5,
              }}>
              {pending.id ? 'Mettre à jour' : 'Ajouter le bloc'}
            </button>
            {pending.id && sequencing.onRemoveBlock && (
              <button type="button" onClick={removePending} aria-label="Supprimer le bloc"
                style={{
                  padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer',
                  background: 'transparent', color: 'var(--danger, #EF4444)', fontSize: 12, fontWeight: 700,
                }}>
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
