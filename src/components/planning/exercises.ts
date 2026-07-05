// ══════════════════════════════════════════════════════════════════
// Modèle d'exercices Gym / Hyrox — partagé entre SessionEditor (desktop)
// et le builder mobile. Extrait de SessionEditor.tsx (zéro changement de
// schéma : ces types alimentent déjà les blocs JSONB sauvegardés).
// ══════════════════════════════════════════════════════════════════
import { BIBLIO_EXO_DEFS } from './biblioExercises'

export type ExoCategory = 'push' | 'pull' | 'legs' | 'mixte' | 'abdos' | 'hyrox'
export interface ExoDefinition {
  id: string; name: string; aliases: string[]; category: ExoCategory
  hasWeight: boolean; hasDistance: boolean; hasKcal: boolean; hasTime: boolean
  defaultReps: number; defaultSets: number; defaultRestSec: number
}
export interface ExerciseItem {
  id: string; exoId: string; name: string; category: ExoCategory
  sets: number; reps: number
  weightKg?: number; distanceM?: number; kcal?: number; targetTimeSec?: number
  restSec: number; notes?: string
}
export interface ExoCircuit {
  id: string
  name: string
  type: string          // 'series' | 'lap' | 'superset' | 'emom' | 'tabata'
  rounds: number
  restBetweenRoundsSec: number
  targetTimeSec?: number
}

export const EXO_CATEGORY_COLOR: Record<ExoCategory, string> = {
  push:  '#f97316',
  pull:  '#3b82f6',
  legs:  '#22c55e',
  mixte: '#a855f7',
  abdos: '#06b6d4',
  hyrox: '#ec4899',
}
export const EXO_CATEGORY_LABEL: Record<ExoCategory, string> = {
  push:  'Push',
  pull:  'Pull',
  legs:  'Legs',
  mixte: 'Mixte',
  abdos: 'Abdos',
  hyrox: 'Hyrox',
}
// Clés i18n parallèles (résolues via t() au site d'affichage). Le libellé FR
// ci-dessus est conservé pour rétro-compat / fallback.
export const EXO_CATEGORY_LABEL_KEY: Record<ExoCategory, string> = {
  push:  'plandata.categoryPush',
  pull:  'plandata.categoryPull',
  legs:  'plandata.categoryLegs',
  mixte: 'plandata.categoryMixte',
  abdos: 'plandata.categoryAbdos',
  hyrox: 'plandata.categoryHyrox',
}

export const EXERCISE_DATABASE: ExoDefinition[] = [
  // PUSH
  { id:'bench_press', name:'Bench Press', aliases:['développé couché','dc','bench'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:120 },
  { id:'dips', name:'Dips', aliases:['dips lestés','weighted dips'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:90 },
  { id:'push_press', name:'Push Press', aliases:['développé militaire','military press','ohp'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:120 },
  { id:'push_up', name:'Push Up', aliases:['pompe','pompes','pushup'], category:'push', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:60 },
  { id:'db_bench', name:'Dumbbell Bench Press', aliases:['bench press haltères','dc haltères'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:4, defaultRestSec:90 },
  { id:'incline_bench', name:'Incline Bench Press', aliases:['bench press incliné','développé incliné','dc incliné'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:4, defaultRestSec:90 },
  { id:'hspu', name:'Handstand Push Up', aliases:['hspu','pompe poirier'], category:'push', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:4, defaultRestSec:120 },
  { id:'pike_push_up', name:'Pike Push Up', aliases:['pompe pike'], category:'push', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'lateral_raise', name:'Lateral Raise', aliases:['élévation latérale','élévations latérales','side lateral raise'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'ohp', name:'Overhead Press', aliases:['ohp','press barre','strict press'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:120 },
  { id:'triceps_pushdown', name:'Triceps Pushdown', aliases:['extension triceps','triceps poulie','pushdown'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'chest_fly', name:'Chest Fly', aliases:['écarté poulie','écarté haltères','pec fly','butterfly'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'cable_crossover', name:'Cable Crossover', aliases:['poulie vis à vis','poulie vis-à-vis','cable fly','cross over poulie'], category:'push', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  // PULL
  { id:'pull_up', name:'Pull Up', aliases:['traction','tractions','tractions lestées','weighted pull up'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:120 },
  { id:'barbell_row', name:'Barbell Row', aliases:['rowing','rowing barre','rowing banc'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:90 },
  { id:'gorilla_row', name:'Gorilla Row', aliases:['rowing gorilla'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:90 },
  { id:'db_row', name:'Dumbbell Row', aliases:['rowing haltère','rowing haltères','rowing 1 bras'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'australian_pullup', name:'Australian Pull Up', aliases:['traction australienne','inverted row'], category:'pull', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'rope_climb', name:'Rope Climb', aliases:['montée de corde','grimper corde'], category:'pull', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:3, defaultSets:3, defaultRestSec:120 },
  { id:'lat_pulldown', name:'Lat Pulldown', aliases:['tirage vertical','tirage poulie haute'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'face_pull', name:'Face Pull', aliases:['face pull poulie'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:60 },
  { id:'bicep_curl', name:'Bicep Curl', aliases:['curl biceps','curl barre','curl haltères'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'hammer_curl', name:'Hammer Curl', aliases:['curl marteau'], category:'pull', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  // LEGS
  { id:'squat', name:'Squat', aliases:['back squat','squat barre'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:150 },
  { id:'front_squat', name:'Front Squat', aliases:['squat avant'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:4, defaultRestSec:150 },
  { id:'deadlift', name:'Deadlift', aliases:['soulevé de terre','sdt'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:4, defaultRestSec:180 },
  { id:'rdl_db', name:'Romanian Deadlift DB', aliases:['rdl haltères','soulevé de terre roumain haltères'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:90 },
  { id:'trap_deadlift', name:'Trap Bar Deadlift', aliases:['deadlift trap','hex bar deadlift'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:4, defaultRestSec:150 },
  { id:'bulgarian', name:'Bulgarian Split Squat', aliases:['bulgarian lunge','fente bulgare'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:3, defaultRestSec:90 },
  { id:'lunge', name:'Lunge', aliases:['fente','fentes'], category:'legs', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'leg_press', name:'Leg Press', aliases:['presse','presse à cuisses'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:4, defaultRestSec:120 },
  { id:'zercher', name:'Zercher Squat', aliases:['zercher'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:3, defaultRestSec:120 },
  { id:'jump_squat', name:'Jump Squat', aliases:['squat sauté','squat jump'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'lateral_jump', name:'Lateral Jump', aliases:['jump latéral','saut latéral'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'pistol_squat', name:'Pistol Squat', aliases:['squat pistol','squat une jambe'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:3, defaultRestSec:90 },
  { id:'box_jump', name:'Box Jump', aliases:['saut sur box'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:3, defaultRestSec:60 },
  { id:'drop_jump', name:'Drop Jump', aliases:['saut en contrebas'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:3, defaultRestSec:90 },
  { id:'squat_jump_box', name:'Squat Jump to Box', aliases:['squat jump box'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:3, defaultRestSec:60 },
  { id:'sled_push_legs', name:'Sled Push', aliases:['poussée de luge','prowler push'], category:'legs', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:4, defaultRestSec:90 },
  { id:'hip_thrust', name:'Hip Thrust', aliases:['hip thrust barre','relevé de bassin'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:90 },
  { id:'leg_extension', name:'Leg Extension', aliases:['extension quadriceps'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'leg_curl', name:'Leg Curl', aliases:['leg curl couché','curl ischio'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'calf_raise', name:'Calf Raise', aliases:['mollets debout','mollets assis','élévation mollets'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:45 },
  { id:'step_up', name:'Step Up', aliases:['montée sur box'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'goblet_squat', name:'Goblet Squat', aliases:['squat gobelet','squat haltère'], category:'legs', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'isometric_squat', name:'Isometric Squat', aliases:['squat isométrique','squat iso','iso squat'], category:'legs', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:60 },
  // MIXTE
  { id:'power_snatch', name:'Power Snatch', aliases:['arraché','snatch haltères','snatch barre'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:4, defaultRestSec:120 },
  { id:'thruster', name:'Thruster', aliases:['thruster barre','thruster haltères'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:4, defaultRestSec:90 },
  { id:'clean', name:'Clean', aliases:['épaulé','power clean'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:5, defaultSets:4, defaultRestSec:120 },
  { id:'clean_jerk', name:'Clean & Jerk', aliases:['clean and jerk','épaulé jeté'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:3, defaultSets:5, defaultRestSec:150 },
  { id:'snatch', name:'Snatch', aliases:['arraché complet'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:3, defaultSets:5, defaultRestSec:150 },
  { id:'tgu', name:'Turkish Get Up', aliases:['tgu','relevé turc'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:3, defaultSets:3, defaultRestSec:90 },
  { id:'kb_swing', name:'Kettlebell Swing', aliases:['swing kettlebell','kb swing','russian swing'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:60 },
  { id:'devil_press', name:'Devil Press', aliases:['devil press haltères'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:8, defaultSets:3, defaultRestSec:90 },
  { id:'man_maker', name:'Man Maker', aliases:['man maker haltères'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:3, defaultRestSec:90 },
  { id:'double_db_snatch', name:'Double Dumbbell Snatch', aliases:['double dumbell snatch','db snatch double','arraché double haltères'], category:'mixte', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:6, defaultSets:4, defaultRestSec:90 },
  // ABDOS
  { id:'crunch', name:'Crunch', aliases:['crunchs','abdos crunch'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:20, defaultSets:3, defaultRestSec:45 },
  { id:'plank', name:'Plank', aliases:['gainage','gainage frontal'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:45 },
  { id:'dynamic_plank', name:'Dynamic Plank', aliases:['gainage dynamique'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:45 },
  { id:'side_plank', name:'Side Plank', aliases:['gainage latéral'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:45 },
  { id:'russian_twist', name:'Russian Twist', aliases:['twist','rotation russe'], category:'abdos', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:20, defaultSets:3, defaultRestSec:45 },
  { id:'hanging_leg_raise', name:'Hanging Leg Raise', aliases:['relevé de jambes'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:12, defaultSets:3, defaultRestSec:60 },
  { id:'ab_wheel', name:'Ab Wheel Rollout', aliases:['roue abdominale','ab roller'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:60 },
  { id:'v_up', name:'V-Up', aliases:['v up'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:15, defaultSets:3, defaultRestSec:45 },
  { id:'hollow_hold', name:'Hollow Hold', aliases:['hollow body','gainage creux'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:3, defaultRestSec:45 },
  { id:'dead_bug', name:'Dead Bug', aliases:['dead bug abdos'], category:'abdos', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:false, defaultReps:10, defaultSets:3, defaultRestSec:45 },
  // HYROX
  { id:'hyrox_run', name:'Run', aliases:['course','running'], category:'hyrox', hasWeight:false, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:0 },
  { id:'hyrox_skierg', name:'SkiErg', aliases:['ski erg','ski'], category:'hyrox', hasWeight:false, hasDistance:true, hasKcal:true, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_sled_push', name:'Sled Push', aliases:['poussée de luge'], category:'hyrox', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_sled_pull', name:'Sled Pull', aliases:['traction de luge'], category:'hyrox', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_bbj', name:'Burpee Broad Jump', aliases:['bbj','burpee saut'], category:'hyrox', hasWeight:false, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:80, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_rowing', name:'Rowing', aliases:['rameur','row','ergomètre'], category:'hyrox', hasWeight:false, hasDistance:true, hasKcal:true, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_farmer', name:'Farmer Carry', aliases:['farmer walk','portée de charges'], category:'hyrox', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_lunges', name:'Sandbag Lunges', aliases:['fentes sandbag'], category:'hyrox', hasWeight:true, hasDistance:true, hasKcal:false, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:30 },
  { id:'hyrox_wall_balls', name:'Wall Balls', aliases:['wall ball'], category:'hyrox', hasWeight:true, hasDistance:false, hasKcal:false, hasTime:true, defaultReps:100, defaultSets:1, defaultRestSec:0 },
  { id:'hyrox_echo_bike', name:'Echo Bike', aliases:['echo bike','assault bike','air bike','vélo air'], category:'hyrox', hasWeight:false, hasDistance:false, hasKcal:true, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:60 },
  { id:'hyrox_assault_bike', name:'Assault Bike', aliases:['assault air bike'], category:'hyrox', hasWeight:false, hasDistance:false, hasKcal:true, hasTime:true, defaultReps:1, defaultSets:1, defaultRestSec:60 },
]

// Base complète = exos « tunés » du builder + toute la bibliothèque Session
// (familles/variantes). Dédup par nom normalisé : l'entrée tunée l'emporte
// (elle porte des défauts séries/reps/repos affinés + des alias de recherche).
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
const TUNED_NAMES = new Set(EXERCISE_DATABASE.map(e => norm(e.name)))
export const ALL_MUSCU_EXERCISES: ExoDefinition[] = [
  ...EXERCISE_DATABASE,
  ...BIBLIO_EXO_DEFS.filter(d => !TUNED_NAMES.has(norm(d.name))),
]

export function searchExercises(query: string, category?: ExoCategory): ExoDefinition[] {
  const q = query.toLowerCase().trim()
  if (!q && !category) return ALL_MUSCU_EXERCISES
  return ALL_MUSCU_EXERCISES.filter(exo => {
    if (category && exo.category !== category) return false
    if (!q) return true
    return exo.name.toLowerCase().includes(q) || exo.aliases.some(a => a.toLowerCase().includes(q))
  })
}
