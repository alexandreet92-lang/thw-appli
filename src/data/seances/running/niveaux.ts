// ══════════════════════════════════════════════════════════════════
// Adaptation du VOLUME d'une séance selon le niveau de l'athlète.
// 4 niveaux, volume en fourchette [min,max]. On dérive une séance
// « scalée » (reps = borne haute) pour le profil SVG et la durée ;
// le déroulé affiche, lui, la fourchette exacte du niveau.
// Helper PUR (pas de React) : réutilisable UI + mapping planning.
// ══════════════════════════════════════════════════════════════════
import type { Seance, Bloc, Niveau, RepsRange, Zone } from './types'

export const NIVEAUX: readonly { id: Niveau; label: string }[] = [
  { id: 'debutant',      label: 'Débutant' },
  { id: 'intermediaire', label: 'Intermédiaire' },
  { id: 'avance',        label: 'Avancé' },
  { id: 'elite',         label: 'Élite' },
]

/** Un bloc porte-t-il une variation de volume par niveau ? */
export function blocARange(b: Bloc): boolean {
  return !!b.repsParNiveau && Object.keys(b.repsParNiveau).length > 0
}

/** La séance propose-t-elle une adaptation par niveau ? */
export function hasNiveaux(s: Seance): boolean {
  return s.blocs.some(blocARange)
}

/** Fourchette de reps d'un bloc pour un niveau (null si pas de variation). */
export function repsRangeFor(b: Bloc, n: Niveau): RepsRange | null {
  return b.repsParNiveau?.[n] ?? null
}

/** Reps « représentatif » (borne haute) — pour le graphe et le planning. */
export function repsRepresentatif(b: Bloc, n: Niveau): number {
  const r = repsRangeFor(b, n)
  return r ? r[1] : (b.reps ?? 1)
}

// Allure de référence schématique (s/km) par zone — mêmes valeurs que le profil.
const REF_PACE: Record<Zone, number> = { Z1: 400, Z2: 340, Z3: 300, Z4: 270, Z5: 240, Z6: 220, Z7: 200 }
function segSec(zone: Zone, dureeSec?: number, distanceM?: number): number {
  if (dureeSec) return dureeSec
  if (distanceM) return (distanceM / 1000) * REF_PACE[zone]
  return 0
}
function blocSec(b: Bloc, reps: number): number {
  const eff = segSec(b.zone, b.dureeSec, b.distanceM)
  const rec = b.recup ? segSec(b.recup.zone, b.recup.dureeSec, b.recup.distanceM) : 0
  return (eff + rec) * reps
}

/**
 * Séance scalée pour un niveau : reps = borne haute du niveau, durée
 * recalculée. Les blocs conservent repsParNiveau pour que le déroulé
 * affiche la fourchette. Sans variation → séance inchangée.
 */
export function scaleSeance(s: Seance, n: Niveau): Seance {
  if (!hasNiveaux(s)) return s
  const blocs = s.blocs.map(b => (b.repsParNiveau ? { ...b, reps: repsRepresentatif(b, n) } : b))
  const totalSec = blocs.reduce((acc, b) => acc + blocSec(b, b.reps ?? 1), 0)
  const dureeEstimeeMin = totalSec > 0 ? Math.round(totalSec / 60) : s.dureeEstimeeMin
  return { ...s, blocs, dureeEstimeeMin }
}

function fmtMesure(b: Bloc): string {
  if (b.distanceM) return b.distanceM >= 1000 ? `${(b.distanceM / 1000).toString().replace('.', ',')} km` : `${b.distanceM} m`
  if (b.dureeSec) return b.dureeSec % 60 === 0 ? `${b.dureeSec / 60}'` : `${b.dureeSec}"`
  return ''
}

/** Texte d'une fourchette : "3 à 4" ou "5" si min=max. */
export function fmtRange(r: RepsRange): string {
  return r[0] === r[1] ? `${r[1]}` : `${r[0]} à ${r[1]}`
}

/**
 * Résumé du volume dominant pour un niveau (le bloc corps au plus gros
 * volume), ex. "5 à 6 × 1000 m". null si aucune variation.
 */
export function volumeSignature(s: Seance, n: Niveau): string | null {
  const corps = s.blocs.filter(b => b.phase === 'corps' && blocARange(b))
  if (!corps.length) return null
  const b = corps.reduce((a, c) => (repsRepresentatif(c, n) > repsRepresentatif(a, n) ? c : a))
  const r = repsRangeFor(b, n)
  if (!r) return null
  return `${fmtRange(r)} × ${fmtMesure(b)}`.trim()
}
