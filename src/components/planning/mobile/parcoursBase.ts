// ══════════════════════════════════════════════════════════════════
// Bloc de FOND « endurance Z2 » d'une sortie vélo avec parcours.
//
// Dès qu'un parcours est intégré à une séance vélo, la sortie est par défaut
// entièrement roulée en endurance Z2 : un bloc de fond couvre km 0 → fin.
// Quand l'utilisateur pose des blocs d'intensité sur des portions, le fond
// se SEGMENTE autour : ses segments réels (`_baseSegments`) sont recalculés
// à partir des portions occupées, et sa durée est ré-estimée par la physique
// du cyclisme sur ces seuls segments.
//
// Le fond reste un bloc unique et ÉDITABLE : changer sa puissance met à jour
// d'un coup toutes ses portions.
// ══════════════════════════════════════════════════════════════════
import { freeSegments, estimateRangeMin, type ElePoint, type KmRange } from '@/lib/gpx/elevation'
import { recalc, type MBlock } from './blocks'
import type { SportType } from '@/app/planning/page'

export const BASE_BLOCK_LABEL = 'Fond endurance Z2'

/** Puissance d'endurance Z2 (~0,65 × FTP). Z2 vélo = 0,55 → 0,75 FTP. */
export function enduranceZ2Watts(ftp: number | null | undefined): number {
  const f = ftp && ftp > 0 ? ftp : 250
  return Math.max(60, Math.round((f * 0.65) / 5) * 5)
}

/** Portions du parcours occupées par des blocs d'INTENSITÉ (hors fond). */
export function intensityRanges(blocks: MBlock[]): KmRange[] {
  return blocks
    .filter(b => !b._base && b._startKm != null && b._endKm != null)
    .map(b => ({ startKm: b._startKm as number, endKm: b._endKm as number }))
}

export interface BaseCtx {
  profile: ElePoint[]
  totalKm: number
  massKg: number
  /** Puissance du fond à utiliser SI le bloc doit être créé. */
  defaultWatts: number
}

function sameSegments(a: KmRange[] | undefined, b: KmRange[]): boolean {
  if (!a || a.length !== b.length) return false
  return a.every((s, i) => Math.abs(s.startKm - b[i].startKm) < 0.005 && Math.abs(s.endKm - b[i].endKm) < 0.005)
}

/**
 * Garantit la présence du bloc de fond et resynchronise ses segments + sa durée.
 * Renvoie la MÊME référence de tableau si rien ne change (pas de boucle d'effet).
 */
export function syncBaseBlock(blocks: MBlock[], ctx: BaseCtx, sport: SportType): MBlock[] {
  const { profile, totalKm, massKg, defaultWatts } = ctx
  if (totalKm <= 0 || profile.length < 2) return blocks

  const idx = blocks.findIndex(b => b._base)
  const existing = idx >= 0 ? blocks[idx] : null
  const watts = Math.max(1, parseInt(existing?.value ?? '') || defaultWatts)
  const segments = freeSegments(totalKm, intensityRanges(blocks))
  const durationMin = Math.round(
    segments.reduce((s, seg) => s + estimateRangeMin(profile, seg.startKm, seg.endKm, watts, massKg), 0),
  )

  if (existing) {
    if (
      sameSegments(existing._baseSegments, segments)
      && existing.durationMin === durationMin
      && existing._startKm === 0
      && existing._endKm === totalKm
    ) return blocks
    const next = [...blocks]
    next[idx] = recalc(sport, { ...existing, _startKm: 0, _endKm: totalKm, _baseSegments: segments, durationMin })
    return next
  }

  const base: MBlock = recalc(sport, {
    id: `base_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    mode: 'single', type: 'effort',
    durationMin, zone: 2, value: String(watts), effortUnit: 'watts', hrAvg: '',
    label: BASE_BLOCK_LABEL,
    _base: true, _startKm: 0, _endKm: totalKm, _baseSegments: segments,
  })
  return [base, ...blocks]
}

/** Change la puissance du fond → toutes ses portions Z2 suivent. */
export function setBaseWatts(blocks: MBlock[], watts: number, ctx: BaseCtx, sport: SportType): MBlock[] {
  const idx = blocks.findIndex(b => b._base)
  if (idx < 0) return blocks
  const w = Math.max(1, Math.round(watts))
  const segments = blocks[idx]._baseSegments ?? freeSegments(ctx.totalKm, intensityRanges(blocks))
  const durationMin = Math.round(
    segments.reduce((s, seg) => s + estimateRangeMin(ctx.profile, seg.startKm, seg.endKm, w, ctx.massKg), 0),
  )
  const next = [...blocks]
  next[idx] = recalc(sport, { ...blocks[idx], value: String(w), durationMin, _baseSegments: segments })
  return next
}
