// ══════════════════════════════════════════════════════════════════
// Adaptation du VOLUME d'une séance selon le niveau de l'athlète.
// 4 niveaux, volume en fourchette [min,max]. UNE dimension varie par bloc :
// nombre de répétitions, distance, ou durée. On dérive une séance « scalée »
// (borne haute) pour le profil SVG + la durée ; le déroulé affiche la fourchette.
// Gère aussi les blocs COMPOSITES (segments à intensité variable).
// Helper PUR (pas de React).
// ══════════════════════════════════════════════════════════════════
import type { Seance, Bloc, BlocSegment, Niveau, RepsRange, Zone } from './types'

export const NIVEAUX: readonly { id: Niveau; label: string }[] = [
  { id: 'debutant',      label: 'Débutant' },
  { id: 'intermediaire', label: 'Intermédiaire' },
  { id: 'avance',        label: 'Avancé' },
  { id: 'elite',         label: 'Élite' },
]

export type Dim = 'reps' | 'distance' | 'duree'

/** Fourchette + dimension qui varie pour un bloc à un niveau (null si fixe). */
export function rangeFor(b: Bloc, n: Niveau): { dim: Dim; range: RepsRange } | null {
  if (b.repsParNiveau?.[n]) return { dim: 'reps', range: b.repsParNiveau[n]! }
  if (b.distanceMParNiveau?.[n]) return { dim: 'distance', range: b.distanceMParNiveau[n]! }
  if (b.dureeSecParNiveau?.[n]) return { dim: 'duree', range: b.dureeSecParNiveau[n]! }
  return null
}

/** Un bloc porte-t-il une variation de volume par niveau ? */
export function blocARange(b: Bloc): boolean {
  const any = b.repsParNiveau ?? b.distanceMParNiveau ?? b.dureeSecParNiveau
  return !!any && Object.keys(any).length > 0
}

/** La séance propose-t-elle une adaptation par niveau ? */
export function hasNiveaux(s: Seance): boolean {
  return s.blocs.some(blocARange)
}

// Allure de référence schématique (s/km) par zone — mêmes valeurs que le profil.
const REF_PACE: Record<Zone, number> = { Z1: 400, Z2: 340, Z3: 300, Z4: 270, Z5: 240, Z6: 220, Z7: 200 }
function segSec(zone: Zone, dureeSec?: number, distanceM?: number): number {
  if (dureeSec) return dureeSec
  if (distanceM) return (distanceM / 1000) * REF_PACE[zone]
  return 0
}
// Durée d'effort d'un bloc (segments composites sommés le cas échéant).
function effortSec(b: Bloc): number {
  if (b.segments && b.segments.length) {
    return b.segments.reduce((a, s) => a + segSec(s.zone, s.dureeSec, s.distanceM), 0)
  }
  return segSec(b.zone, b.dureeSec, b.distanceM)
}
function blocSec(b: Bloc, reps: number): number {
  const rec = b.recup ? segSec(b.recup.zone, b.recup.dureeSec, b.recup.distanceM) : 0
  return (effortSec(b) + rec) * reps
}

/**
 * Séance scalée pour un niveau : la dimension variable prend la borne haute,
 * durée recalculée. Les blocs conservent leurs *ParNiveau (affichage fourchette).
 */
export function scaleSeance(s: Seance, n: Niveau): Seance {
  if (!hasNiveaux(s)) return s
  const blocs = s.blocs.map(b => {
    const r = rangeFor(b, n)
    if (!r) return b
    if (r.dim === 'reps') return { ...b, reps: r.range[1] }
    if (r.dim === 'distance') return { ...b, distanceM: r.range[1] }
    return { ...b, dureeSec: r.range[1] }
  })
  const totalSec = blocs.reduce((acc, b) => acc + blocSec(b, b.reps ?? 1), 0)
  const dureeEstimeeMin = totalSec > 0 ? Math.round(totalSec / 60) : s.dureeEstimeeMin
  return { ...s, blocs, dureeEstimeeMin }
}

// ── Formatage ─────────────────────────────────────────────────
export function fmtRange(r: RepsRange): string {
  return r[0] === r[1] ? `${r[1]}` : `${r[0]} à ${r[1]}`
}
function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toString().replace('.', ',')} km` : `${m} m`
}
function fmtDur(sec: number): string {
  return sec % 60 === 0 ? `${sec / 60}'` : `${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}`
}
function mesureBloc(b: Bloc): string {
  if (b.segments && b.segments.length) return b.segments.map(s => s.label ?? (s.distanceM ? fmtDist(s.distanceM) : s.dureeSec ? fmtDur(s.dureeSec) : '')).filter(Boolean).join(' + ')
  if (b.distanceM) return fmtDist(b.distanceM)
  if (b.dureeSec) return fmtDur(b.dureeSec)
  return ''
}

/** Préfixe de volume d'un bloc pour un niveau : "5 à 6 × ", "1,5 à 2 km", "20 à 25'"… */
export function volumePrefixe(b: Bloc, n: Niveau): { prefix: string; mesure: string } {
  const r = rangeFor(b, n)
  const reps = b.reps ?? 1
  if (!r) return { prefix: reps > 1 ? `${reps} × ` : '', mesure: mesureBloc(b) }
  if (r.dim === 'reps') return { prefix: `${fmtRange(r.range)} × `, mesure: mesureBloc(b) }
  if (r.dim === 'distance') {
    const unite = r.range[1] >= 1000 ? 'km' : 'm'
    const conv = (v: number) => (unite === 'km' ? (v / 1000).toString().replace('.', ',') : `${v}`)
    return { prefix: reps > 1 ? `${reps} × ` : '', mesure: `${conv(r.range[0])} à ${conv(r.range[1])} ${unite}` }
  }
  // duree
  return { prefix: reps > 1 ? `${reps} × ` : '', mesure: `${fmtDur(r.range[0])} à ${fmtDur(r.range[1])}` }
}

/** Résumé du volume dominant pour un niveau (bloc corps au plus gros volume). */
export function volumeSignature(s: Seance, n: Niveau): string | null {
  const corps = s.blocs.filter(b => b.phase === 'corps' && blocARange(b))
  if (!corps.length) return null
  const scaled = scaleSeance(s, n)
  // bloc corps scalé qui cumule le plus de temps d'effort
  let best: Bloc | null = null; let bestSec = -1
  scaled.blocs.forEach((b, i) => {
    if (s.blocs[i]?.phase !== 'corps' || !blocARange(s.blocs[i])) return
    const t = blocSec(b, b.reps ?? 1)
    if (t > bestSec) { bestSec = t; best = b }
  })
  if (!best) return null
  const origIdx = scaled.blocs.indexOf(best)
  const orig = s.blocs[origIdx]
  const { prefix, mesure } = volumePrefixe(orig, n)
  return `${prefix}${mesure}`.trim()
}
