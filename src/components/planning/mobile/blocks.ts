// ══════════════════════════════════════════════════════════════════
// Modèle de blocs pour le builder mobile. `durationMin` reste la durée
// canonique (utilisée par le calcul SM/SN — INCHANGÉ) ; `distanceM` est
// un champ auxiliaire additif (course/natation) pour l'affichage/saisie
// en mode distance. On dérive toujours durationMin depuis distance×allure
// pour ne pas casser SM/SN.
// ══════════════════════════════════════════════════════════════════
import { getZone, type Block, type SportType } from '@/app/planning/page'
import { paceToSec } from './editorial'

export type EffortUnit = 'watts' | 'zone' | 'pace' | 'pctvma'
export type InputMode = 'time' | 'distance'

export type MBlock = Block & {
  distanceM?: number
  recoveryDistanceM?: number
  inputMode?: InputMode
  effortUnit?: EffortUnit
  recoveryStyle?: string   // course : 'trot' | 'marche'
  nage?: string            // natation : Crawl / Dos / Brasse / Pap
}

export const NAGES = ['Crawl', 'Dos', 'Brasse', 'Pap'] as const
export const RECUP_STYLES = ['trot', 'marche'] as const

const uid = () => `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

/** Durée (min) d'un bloc en mode distance, dérivée de l'allure. */
export function durFromDistance(sport: SportType, distanceM: number, paceStr: string): number {
  const sec = paceToSec(paceStr)
  if (isNaN(sec) || !distanceM) return 0
  if (sport === 'swim') return (distanceM / 100) * sec / 60
  return (distanceM / 1000) * sec / 60   // course : allure /km
}

/** Recalcule durationMin / effortMin si le bloc est en mode distance. */
export function recalc(sport: SportType, b: MBlock): MBlock {
  const nb = { ...b }
  if (nb.inputMode === 'distance' && (sport === 'run' || sport === 'swim')) {
    if (nb.mode === 'interval' && nb.reps) {
      nb.effortMin = durFromDistance(sport, nb.distanceM ?? 0, nb.value)
      const rec = nb.recoveryDistanceM != null
        ? durFromDistance(sport, nb.recoveryDistanceM, nb.recoveryValue ?? nb.value)
        : (nb.recoveryMin ?? 0)
      nb.recoveryMin = rec
      nb.durationMin = nb.reps * ((nb.effortMin ?? 0) + (nb.recoveryMin ?? 0))
    } else {
      nb.durationMin = durFromDistance(sport, nb.distanceM ?? 0, nb.value)
    }
  } else if (nb.mode === 'interval' && nb.reps && nb.effortMin != null && nb.recoveryMin != null) {
    nb.durationMin = nb.reps * (nb.effortMin + nb.recoveryMin)
  }
  if (nb.value) nb.zone = getZone(sport, nb.value)
  return nb
}

/** Bloc simple par défaut, calibré par sport (cf. maquettes). */
export function newSingle(sport: SportType): MBlock {
  const base: MBlock = { id: uid(), mode: 'single', type: 'effort', durationMin: 20, zone: 2, value: '', hrAvg: '', label: 'Bloc' }
  if (sport === 'bike') return recalc(sport, { ...base, value: '190', effortUnit: 'watts', durationMin: 30 })
  if (sport === 'run') return recalc(sport, { ...base, inputMode: 'time', value: '5:30', durationMin: 15, effortUnit: 'pace' })
  if (sport === 'swim') return recalc(sport, { ...base, inputMode: 'distance', distanceM: 400, value: '2:10', effortUnit: 'pace' })
  return recalc(sport, base)
}

/** Bloc intervalle / série par défaut, calibré par sport. */
export function newInterval(sport: SportType): MBlock {
  const base: MBlock = {
    id: uid(), mode: 'interval', type: 'effort', durationMin: 0, zone: 5, value: '', hrAvg: '', label: '',
    reps: 6, effortMin: 1, recoveryMin: 1, recoveryZone: 1, recoveryValue: '',
  }
  if (sport === 'bike') return recalc(sport, { ...base, reps: 10, effortMin: 0.5, value: '360', effortUnit: 'watts', recoveryValue: '150', recoveryMin: 1 })
  if (sport === 'run') return recalc(sport, { ...base, inputMode: 'distance', distanceM: 800, value: '3:45', effortUnit: 'pace', recoveryMin: 1.5, recoveryStyle: 'trot' })
  if (sport === 'swim') return recalc(sport, { ...base, inputMode: 'distance', distanceM: 100, reps: 8, zone: 4, value: '1:35', effortUnit: 'pace', nage: 'Crawl', recoveryMin: 0.25 })
  return recalc(sport, base)
}

export interface Bar { id: string; min: number; zone: number; recovery: boolean; value?: string }
/** Aplatit les blocs en barres (1 par effort + 1 par récup d'intervalle). */
export function toBars(blocks: MBlock[]): Bar[] {
  const out: Bar[] = []
  for (const b of blocks) {
    if (b.mode === 'interval' && b.reps && b.effortMin) {
      for (let r = 0; r < b.reps; r++) {
        out.push({ id: `${b.id}_e${r}`, min: b.effortMin, zone: b.zone, recovery: false, value: b.value })
        if (b.recoveryMin && b.recoveryMin > 0) out.push({ id: `${b.id}_r${r}`, min: b.recoveryMin, zone: b.recoveryZone ?? 1, recovery: true, value: b.recoveryValue })
      }
    } else {
      out.push({ id: b.id, min: b.durationMin, zone: b.zone, recovery: false, value: b.value })
    }
  }
  return out
}

/** Durée totale (min) de tous les blocs. */
export function totalMin(blocks: MBlock[]): number {
  return toBars(blocks).reduce((s, b) => s + (b.min || 0), 0)
}
/** Distance totale (m) — somme des distances de bloc (course/natation). */
export function totalDistance(blocks: MBlock[]): number {
  return blocks.reduce((s, b) => {
    if (b.mode === 'interval' && b.reps) return s + (b.distanceM ?? 0) * b.reps
    return s + (b.distanceM ?? 0)
  }, 0)
}

export const BLOCK_NAME: Record<string, string> = {
  warmup: 'Échauffement', effort: 'Bloc', recovery: 'Récupération', cooldown: 'Retour au calme',
}
