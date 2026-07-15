// Types du moteur « Séance en direct » (muscu). Une séance = suite de blocs
// (WorkoutExercise) aplatie en une timeline de pas effort/récup. Phases colorées.
export type PhaseKind = 'summary' | 'prepare' | 'effortReps' | 'effortTime' | 'rest' | 'done'

// Couleur de fond de phase → tokens --phase-*.
export type PhaseColor = 'prepare' | 'effort' | 'rest'

export type EffortNature = 'reps' | 'temps'

export interface EffortExo {
  id: string
  name: string
  nature: EffortNature
  targetReps: number       // cible de reps (nature reps)
  targetWeightKg: number   // cible de charge ; 0 = poids du corps
  bodyweight: boolean       // true tant que charge = 0 (affiche « PDC »)
  durationSec: number       // durée imposée (nature temps)
}

export interface EffortStep {
  kind: 'effort'
  ex: EffortExo
  blockIdx: number
  tourInBlock: number       // 1-based
  toursInBlock: number
  exIdxInTour: number       // 0-based
  exosInTour: number
}

export interface RestStep {
  kind: 'rest'
  sec: number
  blockIdx: number
  tourInBlock: number
  toursInBlock: number
  nextExoName: string
  tourEnd: boolean          // récup de fin de tour (vs récup courte entre exos)
}

export type TimelineStep = EffortStep | RestStep

// Clé d'identité d'un pas — sert à re-localiser le pas courant après un « +1 tour »
// (reconstruction de la timeline sans casser l'index courant).
export function stepKey(s: TimelineStep): string {
  return s.kind === 'effort'
    ? `e:${s.blockIdx}:${s.tourInBlock}:${s.exIdxInTour}`
    : `r:${s.blockIdx}:${s.tourInBlock}:${s.tourEnd ? 'end' : 'mid'}`
}
