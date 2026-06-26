export type WorkoutMode = 'series' | 'circuit' | 'superset' | 'emom' | 'tabata'

export interface WorkoutExercise {
  id: string
  name: string
  mode: WorkoutMode
  sets: number
  reps: number
  weightKg: number
  restSec: number
  durationSec?: number
  // circuit
  circuitRounds?: number
  circuitRestSec?: number
  circuitExercises?: WorkoutExercise[]
  // superset
  supersetPartnerId?: string
  supersetPartner?: WorkoutExercise
  // emom
  emomMinutes?: number
  // tabata
  tabataRounds?: number
  tabataWorkSec?: number
  tabataRestSec?: number
}

export interface CompletedSet {
  exerciseId: string
  setIndex: number
  reps: number
  weightKg: number
  completedAt: number
}

export interface WorkoutSummaryData {
  id: string | null
  sport: 'gym' | 'hyrox'
  durationSec: number
  exercises: WorkoutExercise[]
  completedSets: CompletedSet[]
  totalVolumeKg: number
  calories: number
  rpe: number
  title: string
}

export const STRENGTH_TYPES = [
  { id: 'strength',         label: 'Strength',          desc: 'Force, charges lourdes' },
  { id: 'endurance-strength', label: 'Endurance Strength', desc: 'Séries longues' },
  { id: 'hypertrophie',     label: 'Hypertrophie',      desc: 'Masse musculaire' },
  { id: 'explosivite',      label: 'Explosivité',       desc: 'Puissance, vitesse' },
]

export const HYROX_TYPES = [
  { id: 'competition', label: 'Compétition', desc: 'Format course officiel' },
  { id: 'simulation',  label: 'Simulation',  desc: 'Simulation complète' },
  { id: 'fractions',   label: 'Fractionné',  desc: 'Stations isolées' },
  { id: 'endurance',   label: 'Endurance',   desc: 'Volume et cardio' },
  { id: 'force',       label: 'Force',       desc: 'Focus stations de force' },
]

export const DEFAULT_GYM_EXERCISES: WorkoutExercise[] = [
  { id: 'squat',    name: 'Squat barre',      mode: 'series', sets: 4, reps: 8,  weightKg: 60, restSec: 120 },
  { id: 'bench',    name: 'Développé couché', mode: 'series', sets: 4, reps: 8,  weightKg: 50, restSec: 120 },
  { id: 'deadlift', name: 'Soulevé de terre', mode: 'series', sets: 3, reps: 5,  weightKg: 80, restSec: 180 },
  { id: 'ohp',      name: 'Développé mil.',   mode: 'series', sets: 3, reps: 8,  weightKg: 40, restSec: 90  },
  { id: 'row',      name: 'Rowing barre',     mode: 'series', sets: 4, reps: 10, weightKg: 50, restSec: 90  },
  { id: 'pull',     name: 'Tractions',        mode: 'series', sets: 3, reps: 8,  weightKg: 0,  restSec: 120 },
  { id: 'lunge',    name: 'Fentes',           mode: 'series', sets: 3, reps: 12, weightKg: 20, restSec: 60  },
  { id: 'curl',     name: 'Curl biceps',      mode: 'series', sets: 3, reps: 12, weightKg: 15, restSec: 60  },
  { id: 'tricep',   name: 'Triceps poulie',   mode: 'series', sets: 3, reps: 12, weightKg: 25, restSec: 60  },
  { id: 'press',    name: 'Leg press',        mode: 'series', sets: 4, reps: 12, weightKg: 80, restSec: 90  },
  { id: 'rdl',      name: 'Romanian DL',      mode: 'series', sets: 3, reps: 10, weightKg: 50, restSec: 90  },
  { id: 'plank',    name: 'Gainage',          mode: 'series', sets: 3, reps: 1,  weightKg: 0,  restSec: 60, durationSec: 60 },
  { id: 'pushup',   name: 'Pompes',           mode: 'series', sets: 3, reps: 20, weightKg: 0,  restSec: 60  },
  { id: 'kb',       name: 'Kettlebell swing', mode: 'series', sets: 3, reps: 15, weightKg: 24, restSec: 60  },
  { id: 'cable',    name: 'Cable crossover',  mode: 'series', sets: 3, reps: 12, weightKg: 15, restSec: 60  },
]

export const DEFAULT_HYROX_EXERCISES: WorkoutExercise[] = [
  { id: 'run1',    name: 'Run 1km',           mode: 'series', sets: 1, reps: 1, weightKg: 0, restSec: 60, durationSec: 300 },
  { id: 'skierg',  name: 'SkiErg 1000m',      mode: 'series', sets: 1, reps: 1, weightKg: 0, restSec: 60, durationSec: 240 },
  { id: 'sled_p',  name: 'Sled Push 50m',     mode: 'series', sets: 1, reps: 1, weightKg: 102, restSec: 60 },
  { id: 'sled_pl', name: 'Sled Pull 50m',     mode: 'series', sets: 1, reps: 1, weightKg: 78, restSec: 60 },
  { id: 'bbj',     name: 'Burpee Broad Jump', mode: 'series', sets: 1, reps: 80, weightKg: 0, restSec: 60 },
  { id: 'rowing',  name: 'Rowing 1000m',      mode: 'series', sets: 1, reps: 1, weightKg: 0, restSec: 60, durationSec: 240 },
  { id: 'farmer',  name: 'Farmer Carry 200m', mode: 'series', sets: 1, reps: 1, weightKg: 24, restSec: 60 },
  { id: 'lunges',  name: 'Fentes 100m',       mode: 'series', sets: 1, reps: 1, weightKg: 20, restSec: 60 },
  { id: 'wb',      name: 'Wall Balls 100',    mode: 'series', sets: 1, reps: 100, weightKg: 9, restSec: 60 },
]
