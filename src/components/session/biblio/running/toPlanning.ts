// ══════════════════════════════════════════════════════════════════
// Conversion d'une séance de la BIBLIOTHÈQUE running (Seance/Bloc) vers les
// blocs du PLANNING (Block[]). Les allures sont pré-remplies par zone (point
// de départ que l'athlète ajuste ensuite dans l'éditeur). Objectif : que les
// blocs d'intensité se retranscrivent réellement dans le planning.
// ══════════════════════════════════════════════════════════════════
import type { Block } from '@/app/planning/page'
import type { Bloc, Seance, Zone, PhaseBloc } from '@/data/seances/running'

// Allure de départ par zone (min/km) — repère raisonnable, ajustable.
const ZONE_PACE: Record<Zone, string> = { Z1: '6:30', Z2: '5:30', Z3: '4:50', Z4: '4:20', Z5: '3:55', Z6: '3:35', Z7: '3:15' }
function zoneNum(z: Zone): number { return Math.max(1, Math.min(7, Number(z.slice(1)) || 2)) }
function paceSec(z: Zone): number { const [m, s] = ZONE_PACE[z].split(':').map(Number); return m * 60 + (s || 0) }
function phaseType(p: PhaseBloc): Block['type'] {
  return p === 'echauffement' ? 'warmup' : p === 'retour-calme' ? 'cooldown' : p === 'recup' ? 'recovery' : 'effort'
}

let seq = 0
const uid = () => `bib_${Date.now()}_${seq++}`

// Durée (min) d'un effort selon distance (m) ou durée (s), à l'allure de la zone.
function effortMinFor(z: Zone, dureeSec?: number, distanceM?: number): number {
  if (dureeSec) return dureeSec / 60
  if (distanceM) return (distanceM / 1000) * paceSec(z) / 60
  return 0
}

function blocToBlock(b: Bloc): Block {
  const z = b.zone
  const zn = zoneNum(z)
  const reps = b.reps ?? 1
  const type = phaseType(b.phase)
  const value = ZONE_PACE[z]
  const effMin = effortMinFor(z, b.dureeSec, b.distanceM)

  // Intervalle : reps > 1, ou présence d'une récup entre reps.
  if (reps > 1 || b.recup) {
    const recZone = b.recup?.zone ?? 'Z1'
    const recMin = b.recup ? effortMinFor(recZone, b.recup.dureeSec, b.recup.distanceM) || 1 : 1
    const block: Block & Record<string, unknown> = {
      id: uid(), mode: 'interval', type, durationMin: reps * (effMin + recMin), zone: zn,
      value, hrAvg: '', label: b.label, reps,
      effortMin: effMin, recoveryMin: recMin, recoveryZone: zoneNum(recZone), recoveryValue: '',
      // champs MBlock additifs (persistés tels quels)
      inputMode: b.distanceM ? 'distance' : 'time', distanceM: b.distanceM, effortUnit: 'pace', recoveryStyle: 'trot',
    }
    return block as Block
  }

  // Bloc simple (échauffement, sortie continue, retour au calme).
  const block: Block & Record<string, unknown> = {
    id: uid(), mode: 'single', type, durationMin: effMin || 15, zone: zn,
    value, hrAvg: '', label: b.label,
    inputMode: b.distanceM ? 'distance' : 'time', distanceM: b.distanceM, effortUnit: 'pace',
  }
  return block as Block
}

/** Convertit les blocs d'une séance bibliothèque (déjà scalée au niveau) en blocs planning. */
export function runningSeanceToBlocks(seance: Seance): Block[] {
  return seance.blocs.map(blocToBlock)
}
