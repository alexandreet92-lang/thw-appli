// Aplatit les blocs d'une séance planifiée (planned_sessions.blocks) en une
// timeline linéaire d'intervalles. Pur, testable. Les durées de la séance sont
// en MINUTES ; la cible vélo est stockée en WATTS ABSOLUS dans `value` (repli :
// milieu de la zone × FTP). On ne fabrique aucune valeur : si `blocks` est vide
// ou illisible, on renvoie null (sortie libre).
import type { RideBlock, RidePlan } from './types'
import { ZONES } from './zones'

/** Forme structurelle d'un bloc tel que persisté en JSONB (sous-ensemble utile). */
export interface PlannedBlock {
  mode?: string
  type?: string
  durationMin?: number
  zone?: number
  value?: string
  reps?: number
  effortMin?: number
  recoveryMin?: number
  recoveryZone?: number
  recoveryValue?: string
  label?: string
}

const NAME_BY_TYPE: Record<string, string> = {
  warmup: 'Échauffement', effort: 'Effort', recovery: 'Récupération', cooldown: 'Retour au calme',
}
const KIND_BY_TYPE: Record<string, RideBlock['kind']> = {
  warmup: 'warmup', effort: 'effort', recovery: 'recovery', cooldown: 'cooldown', circuit_header: 'block',
}

/** Fraction de FTP au milieu d'une zone 1-based (repli quand value non chiffrée). */
function zoneMidFraction(zone1: number): number {
  const i = Math.max(0, Math.min(ZONES.length - 1, (zone1 || 1) - 1))
  const lower = i === 0 ? 0 : ZONES[i - 1].upper
  const upper = Number.isFinite(ZONES[i].upper) ? ZONES[i].upper : 1.6
  return (lower + upper) / 2
}

/** Cible en watts : nombre dans `value` sinon milieu de zone × FTP. */
function targetWatts(value: string | undefined, zone: number | undefined, ftp: number): number {
  const n = Number((value ?? '').trim())
  if (Number.isFinite(n) && n > 0) return Math.round(n)
  return Math.round(zoneMidFraction(zone ?? 1) * ftp)
}

function nameOf(b: PlannedBlock): string {
  const l = (b.label ?? '').trim()
  if (l) return l
  return NAME_BY_TYPE[b.type ?? ''] ?? 'Bloc'
}

export function buildPlan(blocks: PlannedBlock[] | null | undefined, ftp: number, title: string): RidePlan | null {
  if (!Array.isArray(blocks) || blocks.length === 0) return null
  const flat: Omit<RideBlock, 't0' | 't1'>[] = []

  for (const b of blocks) {
    const kind = KIND_BY_TYPE[b.type ?? ''] ?? 'block'
    if (b.mode === 'interval' && b.reps && b.effortMin) {
      for (let r = 0; r < b.reps; r++) {
        flat.push({ name: nameOf(b), kind: 'effort', durationS: Math.round(b.effortMin * 60), targetW: targetWatts(b.value, b.zone, ftp), rep: r + 1, of: b.reps })
        if (b.recoveryMin && b.recoveryMin > 0) {
          flat.push({ name: 'Récupération', kind: 'recovery', durationS: Math.round(b.recoveryMin * 60), targetW: targetWatts(b.recoveryValue, b.recoveryZone, ftp) })
        }
      }
    } else {
      const durS = Math.round((b.durationMin ?? 0) * 60)
      if (durS <= 0) continue
      flat.push({ name: nameOf(b), kind, durationS: durS, targetW: targetWatts(b.value, b.zone, ftp) })
    }
  }

  if (flat.length === 0) return null
  let t = 0
  const out: RideBlock[] = flat.map(fb => { const t0 = t; t += fb.durationS; return { ...fb, t0, t1: t } })
  return { title, blocks: out, totalS: t }
}
