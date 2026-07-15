// Génère la timeline (pas effort/récup) depuis la séance planifiée réelle
// (WorkoutExercise[]). Zéro donnée inventée : tout vient du plan.
//   - Séries  : tours = sets, un exo, récup entre tours = restSec.
//   - Circuit : tours = circuitRounds, exos = circuitExercises, récup entre exos
//               = restSec de l'exo, récup entre tours = circuitRestSec.
// Modes hors périmètre (superset/emom/tabata) : dégradés en un bloc « séries »
// (sets × l'exo) pour ne pas planter — leur comportement spécialisé n'est PAS
// implémenté dans ce lot.
import type { WorkoutExercise } from '@/types/workout'
import type { EffortExo, TimelineStep } from './types'

const PREPARE_SEC = 10
const EFFORT_ESTIMATE_SEC = 35 // estimation durée d'un effort aux reps (résumé)

function toExo(ex: WorkoutExercise): EffortExo {
  const nature = ex.durationSec && ex.durationSec > 0 ? 'temps' : 'reps'
  return {
    id: ex.id,
    name: ex.name,
    nature,
    targetReps: ex.reps,
    targetWeightKg: ex.weightKg,
    bodyweight: ex.weightKg === 0,
    durationSec: ex.durationSec ?? 0,
  }
}

function rest(sec: number, blockIdx: number, tour: number, tours: number, nextName: string, tourEnd: boolean): TimelineStep {
  return { kind: 'rest', sec, blockIdx, tourInBlock: tour, toursInBlock: tours, nextExoName: nextName, tourEnd }
}

const firstExoName = (b: WorkoutExercise | undefined): string =>
  !b ? '' : b.mode === 'circuit' ? b.circuitExercises?.[0]?.name ?? '' : b.name

export function buildTimeline(blocks: WorkoutExercise[]): TimelineStep[] {
  const steps: TimelineStep[] = []
  blocks.forEach((block, blockIdx) => {
    const isCircuit = block.mode === 'circuit'
    const rawExos = isCircuit ? block.circuitExercises ?? [] : [block]
    const exos = rawExos.length ? rawExos : [block]
    const toursInBlock = Math.max(1, isCircuit ? block.circuitRounds ?? 1 : block.sets)
    const exosInTour = exos.length
    const tourRest = isCircuit ? block.circuitRestSec ?? 0 : block.restSec ?? 0
    const lastBlock = blockIdx === blocks.length - 1

    for (let tour = 1; tour <= toursInBlock; tour++) {
      exos.forEach((raw, exIdx) => {
        steps.push({ kind: 'effort', ex: toExo(raw), blockIdx, tourInBlock: tour, toursInBlock, exIdxInTour: exIdx, exosInTour })
        const lastExo = exIdx === exosInTour - 1
        const lastTour = tour === toursInBlock
        if (!lastExo) {
          const sec = isCircuit ? raw.restSec ?? 0 : 0
          if (sec > 0) steps.push(rest(sec, blockIdx, tour, toursInBlock, exos[exIdx + 1]?.name ?? '', false))
        } else if (!lastTour) {
          if (tourRest > 0) steps.push(rest(tourRest, blockIdx, tour, toursInBlock, exos[0]?.name ?? '', true))
        } else if (!lastBlock) {
          const sec = tourRest || block.restSec || 0
          if (sec > 0) steps.push(rest(sec, blockIdx, tour, toursInBlock, firstExoName(blocks[blockIdx + 1]), true))
        }
      })
    }
  })
  return steps
}

// Durée estimée totale (résumé) : prépa + efforts (temps réel ou estimation) + récups.
export function estimateDurationSec(steps: TimelineStep[]): number {
  return steps.reduce((acc, s) => {
    if (s.kind === 'rest') return acc + s.sec
    return acc + (s.ex.nature === 'temps' ? s.ex.durationSec : EFFORT_ESTIMATE_SEC)
  }, PREPARE_SEC)
}

export { PREPARE_SEC }
