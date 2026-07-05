// ══════════════════════════════════════════════════════════════════
// Adaptation du VOLUME d'une séance Vélo selon le niveau de l'athlète.
// 4 niveaux, volume en fourchette [min,max]. UNE dimension varie par bloc :
// nombre de répétitions OU durée d'effort (le vélo est 100% time-based).
// On dérive une séance « scalée » (borne haute) pour le profil SVG, et on
// recalcule la fourchette de durée totale (min = borne basse, max = borne haute).
// Gère aussi les blocs COMPOSITES (segments à intensité variable).
// Helper PUR (pas de React).
// ══════════════════════════════════════════════════════════════════
import type { Seance, Bloc, Niveau, RepsRange } from './types'

export const NIVEAUX: readonly { id: Niveau; label: string }[] = [
  { id: 'debutant',      label: 'Débutant' },
  { id: 'intermediaire', label: 'Intermédiaire' },
  { id: 'avance',        label: 'Avancé' },
  { id: 'elite',         label: 'Élite' },
]

export type Dim = 'reps' | 'duree'

/** Fourchette + dimension qui varie pour un bloc à un niveau (null si fixe). */
export function rangeFor(b: Bloc, n: Niveau): { dim: Dim; range: RepsRange } | null {
  if (b.repsParNiveau?.[n]) return { dim: 'reps', range: b.repsParNiveau[n]! }
  if (b.dureeSecParNiveau?.[n]) return { dim: 'duree', range: b.dureeSecParNiveau[n]! }
  return null
}

/** Un bloc porte-t-il une variation de volume par niveau ? */
export function blocARange(b: Bloc): boolean {
  const any = b.repsParNiveau ?? b.dureeSecParNiveau
  return !!any && Object.keys(any).length > 0
}

/** La séance propose-t-elle une adaptation par niveau ? */
export function hasNiveaux(s: Seance): boolean {
  return s.blocs.some(blocARange)
}

// Durée d'effort d'un bloc (segments composites + micro-récups sommés).
function effortSec(b: Bloc): number {
  if (b.segments && b.segments.length) {
    return b.segments.reduce((a, s) => a + s.dureeSec + (s.recupSec ?? 0), 0)
  }
  return b.dureeSec ?? 0
}

// Durée totale d'un bloc à une borne (0 = basse, 1 = haute).
function blocSecBound(b: Bloc, n: Niveau, bound: 0 | 1): number {
  const r = rangeFor(b, n)
  let reps = b.reps ?? 1
  let eff = effortSec(b)
  if (r?.dim === 'reps') reps = r.range[bound]
  else if (r?.dim === 'duree') eff = r.range[bound]
  const rec = b.recup ? b.recup.dureeSec : 0
  return (eff + rec) * reps
}

/**
 * Séance scalée pour un niveau : la dimension variable prend la borne haute
 * (pour le profil SVG), et la fourchette de durée totale est recalculée.
 */
export function scaleSeance(s: Seance, n: Niveau): Seance {
  if (!hasNiveaux(s)) return s
  const blocs = s.blocs.map(b => {
    const r = rangeFor(b, n)
    if (!r) return b
    if (r.dim === 'reps') return { ...b, reps: r.range[1] }
    return { ...b, dureeSec: r.range[1] }
  })
  const lo = s.blocs.reduce((acc, b) => acc + blocSecBound(b, n, 0), 0)
  const hi = s.blocs.reduce((acc, b) => acc + blocSecBound(b, n, 1), 0)
  const dureeMinMin = lo > 0 ? Math.round(lo / 60) : s.dureeMinMin
  const dureeMaxMin = hi > 0 ? Math.round(hi / 60) : s.dureeMaxMin
  return { ...s, blocs, dureeMinMin, dureeMaxMin }
}

// ── Formatage ─────────────────────────────────────────────────
export function fmtRange(r: RepsRange): string {
  return r[0] === r[1] ? `${r[1]}` : `${r[0]} à ${r[1]}`
}
function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
  if (m > 0) return s ? `${m}'${String(s).padStart(2, '0')}` : `${m}'`
  return `${s}"`
}
function mesureBloc(b: Bloc): string {
  if (b.segments && b.segments.length) return b.segments.map(s => s.label ?? fmtDur(s.dureeSec)).filter(Boolean).join(' + ')
  return fmtDur(b.dureeSec ?? 0)
}

/** Préfixe de volume d'un bloc pour un niveau : "5 à 6 × ", "20 à 25'"… */
export function volumePrefixe(b: Bloc, n: Niveau): { prefix: string; mesure: string } {
  const r = rangeFor(b, n)
  const reps = b.reps ?? 1
  if (!r) return { prefix: reps > 1 ? `${reps} × ` : '', mesure: mesureBloc(b) }
  if (r.dim === 'reps') return { prefix: `${fmtRange(r.range)} × `, mesure: mesureBloc(b) }
  // duree
  return { prefix: reps > 1 ? `${reps} × ` : '', mesure: `${fmtDur(r.range[0])} à ${fmtDur(r.range[1])}` }
}

/** Résumé du volume dominant pour un niveau (bloc corps au plus gros volume). */
export function volumeSignature(s: Seance, n: Niveau): string | null {
  const corps = s.blocs.filter(b => b.phase === 'corps' && blocARange(b))
  if (!corps.length) return null
  const scaled = scaleSeance(s, n)
  let best: Bloc | null = null; let bestSec = -1
  scaled.blocs.forEach((b, i) => {
    if (s.blocs[i]?.phase !== 'corps' || !blocARange(s.blocs[i])) return
    const t = blocSecBound(b, n, 1)
    if (t > bestSec) { bestSec = t; best = b }
  })
  if (!best) return null
  const origIdx = scaled.blocs.indexOf(best)
  const orig = s.blocs[origIdx]
  const { prefix, mesure } = volumePrefixe(orig, n)
  return `${prefix}${mesure}`.trim()
}
