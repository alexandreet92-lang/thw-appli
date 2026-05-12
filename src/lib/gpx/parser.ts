// ══════════════════════════════════════════════════════════════
// src/lib/gpx/parser.ts
//
// Segmentation du profil altimétrique — 100 % client-side
// Pipeline : lissage 100m → gradient → classification → fusion
//            → tolérance 300m → filtrage
//
// Aucune dépendance externe. Aucun appel réseau.
// ══════════════════════════════════════════════════════════════

export type TerrainType = 'climb' | 'descent' | 'flat'

/** Segment de terrain issu du parsing GPX (sans estimée FTP-dépendante) */
export interface ParsedSegment {
  startKm: number
  endKm: number
  startEle: number
  endEle: number
  distanceKm: number
  avgGradient: number      // % signé — positif = montée
  maxGradient: number      // % non signé — pic sur le segment
  elevationDeltaM: number  // m signés — positif = gain
  type: TerrainType
}

/** Montée significative pour le context prompt IA */
export interface SignificantClimb {
  startKm: number
  endKm: number
  distanceKm: number
  elevationGainM: number
  avgGradientPct: number
  maxGradientPct: number
}

// ── Seuils ────────────────────────────────────────────────────
const CLIMB_THRESHOLD   =  2.0   // % → montée au-dessus
const DESCENT_THRESHOLD = -2.0   // % → descente en dessous
const SMOOTH_WINDOW_KM  =  0.10  // 100 m — fenêtre lissage altimétrique
const MIN_LENGTH_KM     =  0.50  // 500 m — longueur minimale d'un segment
const MIN_ELEV_GAIN_M   =  15    // 15 m D+ minimum pour qualifier une montée
const GAP_TOLERANCE_KM  =  0.30  // 300 m — transition tolérée entre deux montées

// ─────────────────────────────────────────────────────────────
/** Lisse un profil altimétrique avec une fenêtre distance (km). */
function smoothProfile(
  profile: Array<{ distKm: number; ele: number }>,
): Array<{ distKm: number; ele: number }> {
  const half = SMOOTH_WINDOW_KM / 2
  return profile.map((p) => {
    let sum = 0, count = 0
    for (const q of profile) {
      if (Math.abs(q.distKm - p.distKm) <= half) { sum += q.ele; count++ }
    }
    return { distKm: p.distKm, ele: count > 0 ? sum / count : p.ele }
  })
}

// ─────────────────────────────────────────────────────────────
/** Calcule le gradient (%) entre chaque paire de points lissés. */
function computeGradients(
  smoothed: Array<{ distKm: number; ele: number }>,
): number[] {
  return smoothed.map((p, i) => {
    if (i === 0) return 0
    const dDist = (p.distKm - smoothed[i - 1].distKm) * 1000 // m
    const dEle  = p.ele - smoothed[i - 1].ele
    return dDist > 0.1 ? (dEle / dDist) * 100 : 0
  })
}

function classify(g: number): TerrainType {
  if (g > CLIMB_THRESHOLD) return 'climb'
  if (g < DESCENT_THRESHOLD) return 'descent'
  return 'flat'
}

// ─────────────────────────────────────────────────────────────
/**
 * Segmente un profil altimétrique en terrains typés.
 *
 * @param profile   Array<{distKm, ele}> — sortie de buildElevationProfile()
 * @returns ParsedSegment[] — sans estimée temps (calculée plus tard avec FTP)
 */
export function segmentElevationProfile(
  profile: Array<{ distKm: number; ele: number }>,
): ParsedSegment[] {
  if (profile.length < 4) return []

  const smoothed  = smoothProfile(profile)
  const gradients = computeGradients(smoothed)

  // ── 1. Run-length encoding brut ─────────────────────────────
  type RawSeg = { type: TerrainType; from: number; to: number }
  const raw: RawSeg[] = []
  let curType = classify(gradients[1] ?? 0)
  let from    = 0

  for (let i = 1; i < gradients.length; i++) {
    const t = classify(gradients[i])
    if (t !== curType) {
      raw.push({ type: curType, from, to: i - 1 })
      curType = t
      from    = i - 1
    }
  }
  raw.push({ type: curType, from, to: gradients.length - 1 })

  // ── 2. Convertir en ParsedSegment ───────────────────────────
  function toSeg(r: RawSeg): ParsedSegment {
    const s = smoothed[r.from]
    const e = smoothed[r.to]
    const distKm      = Math.max(0, e.distKm - s.distKm)
    const dEle        = e.ele - s.ele
    const avgGradient = distKm > 0 ? (dEle / (distKm * 1000)) * 100 : 0
    let   maxGradient = 0
    for (let i = r.from; i <= r.to; i++) {
      if (Math.abs(gradients[i]) > maxGradient) maxGradient = Math.abs(gradients[i])
    }
    return {
      startKm:        Math.round(s.distKm * 10) / 10,
      endKm:          Math.round(e.distKm * 10) / 10,
      startEle:       Math.round(s.ele),
      endEle:         Math.round(e.ele),
      distanceKm:     Math.round(distKm * 10) / 10,
      avgGradient:    Math.round(avgGradient * 10) / 10,
      maxGradient:    Math.round(maxGradient * 10) / 10,
      elevationDeltaM: Math.round(dEle),
      type:           r.type,
    }
  }

  // ── 3. Fusion adjacents de même type ────────────────────────
  function mergeSegs(segs: ParsedSegment[]): ParsedSegment[] {
    const out: ParsedSegment[] = []
    for (const seg of segs) {
      const prev = out[out.length - 1]
      if (prev && prev.type === seg.type) {
        const distKm      = seg.endKm - prev.startKm
        const dEle        = seg.endEle - prev.startEle
        const avgGradient = distKm > 0 ? (dEle / (distKm * 1000)) * 100 : 0
        out[out.length - 1] = {
          ...prev,
          endKm:           seg.endKm,
          endEle:          seg.endEle,
          distanceKm:      Math.round(distKm * 10) / 10,
          avgGradient:     Math.round(avgGradient * 10) / 10,
          maxGradient:     Math.max(prev.maxGradient, seg.maxGradient),
          elevationDeltaM: Math.round(dEle),
        }
      } else {
        out.push({ ...seg })
      }
    }
    return out
  }

  // ── 4. Tolérance 300 m : fusionner transitions courtes entre montées ──
  function applyGapTolerance(segs: ParsedSegment[]): ParsedSegment[] {
    let changed = true
    let cur = [...segs]
    while (changed) {
      changed = false
      const next: ParsedSegment[] = []
      for (let i = 0; i < cur.length; i++) {
        const prev   = next[next.length - 1]
        const curr   = cur[i]
        const nxt    = cur[i + 1]
        // Si prev=montée, curr=plat/descente <300m, nxt=montée → fusionner
        if (
          prev?.type === 'climb' &&
          nxt?.type  === 'climb' &&
          curr.type  !== 'climb' &&
          curr.distanceKm < GAP_TOLERANCE_KM
        ) {
          const distKm      = nxt.endKm - prev.startKm
          const dEle        = nxt.endEle - prev.startEle
          const avgGradient = distKm > 0 ? (dEle / (distKm * 1000)) * 100 : 0
          next[next.length - 1] = {
            ...prev,
            endKm:           nxt.endKm,
            endEle:          nxt.endEle,
            distanceKm:      Math.round(distKm * 10) / 10,
            avgGradient:     Math.round(avgGradient * 10) / 10,
            maxGradient:     Math.max(prev.maxGradient, curr.maxGradient, nxt.maxGradient),
            elevationDeltaM: Math.round(dEle),
          }
          i++ // consommer nxt
          changed = true
        } else {
          next.push({ ...curr })
        }
      }
      cur = next
    }
    return cur
  }

  // ── 5. Filtrage ──────────────────────────────────────────────
  function filterSegs(segs: ParsedSegment[]): ParsedSegment[] {
    return segs.filter(s => {
      if (s.distanceKm < MIN_LENGTH_KM) return false
      if (s.type === 'climb' && s.elevationDeltaM < MIN_ELEV_GAIN_M) return false
      return true
    })
  }

  const rawSegs  = raw.map(toSeg)
  const merged   = mergeSegs(rawSegs)
  const tolerant = applyGapTolerance(merged)
  return filterSegs(tolerant)
}

// ─────────────────────────────────────────────────────────────
/**
 * Extrait uniquement les montées significatives pour le prompt IA.
 * Filtre : type=climb (les plats/descentes sont inférés par l'IA).
 */
export function getSignificantClimbs(segments: ParsedSegment[]): SignificantClimb[] {
  return segments
    .filter(s => s.type === 'climb')
    .map(s => ({
      startKm:        s.startKm,
      endKm:          s.endKm,
      distanceKm:     s.distanceKm,
      elevationGainM: s.elevationDeltaM,
      avgGradientPct: s.avgGradient,
      maxGradientPct: s.maxGradient,
    }))
}
