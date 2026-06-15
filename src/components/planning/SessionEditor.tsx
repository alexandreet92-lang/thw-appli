'use client'
/**
 * SessionEditor — extrait depuis src/app/planning/page.tsx
 * Inclut le composant SessionEditor + tous ses sous-composants privés
 * (BlockBuilder, ExerciseListBuilder, StrengthBlockRenderer, LocalInput,
 * IntervalPanel, ElevationChart, GPSMap*, SessionExecute) ainsi que
 * leurs types/constantes/helpers propres (NutritionItem, ParcoursData,
 * EXERCISE_DATABASE, etc.).
 *
 * Les types et helpers partagés avec planning/page.tsx (Block, Session,
 * SportType, SPORT_BORDER, formatHM, etc.) sont importés depuis le fichier
 * d'origine. Cycle d'import résolu : planning/page.tsx importe `SessionEditor`
 * (value) → SessionEditor.tsx importe shared values qui sont déjà déclarés
 * en haut du module planning/page.tsx avant le call site.
 */
import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTrainingZones } from '@/hooks/useTrainingZones'
import { segmentElevationProfile, getSignificantClimbs } from '@/lib/gpx/parser'
import type { ParsedSegment } from '@/lib/gpx/parser'
import { formatDuration } from '@/lib/utils'
import { SportIcon } from '@/components/icons/SportIcon'

import {
  // Types
  type SportType, type BlockMode, type BlockType, type Block, type Session,
  type PlanVariant, type CircuitType, type CyclingSub, type DayIntensity,
  type TrainingActivity, type Race,
  // Constantes
  SPORT_LABEL, SPORT_ABBR, SPORT_BG, SPORT_BORDER, SPORT_SHORT,
  CYCLING_SUB_LABEL, TRAINING_TYPES, ZONE_COLORS,
  BLOCK_TYPE_LABEL, CIRCUIT_TYPES, SPORT_TO_BUILDER, ATHLETE,
  RACE_CONFIG, INTENSITY_CONFIG, INTENSITY_ORDER, DAY_NAMES,
  // Helpers
  uid, formatHM, fmtDuration, daysUntil, isSessionModified,
  normalizeBlock, normalizeBlocks, parseGymExercise,
  localDateStr, getWeekStart, parseZoneStr, sessionBuilderBlocToBlock,
  getTodayIdx, getZone, computeSessionStats, computeZoneDistributionSafe,
  computeTSSRange, getWeekDates, getWeekStartFromOffset, getWeekDatesFromStart,
  getWeekLabel, normalizeSportType, isRestSession, matchActivity, matchStatus,
  SportBadge, InfoModal, ActivityQuickModal,
} from '@/app/planning/page'

type ExoCategory = 'push' | 'pull' | 'legs' | 'mixte' | 'abdos' | 'hyrox'
interface ExoDefinition {
  id: string; name: string; aliases: string[]; category: ExoCategory
  hasWeight: boolean; hasDistance: boolean; hasKcal: boolean; hasTime: boolean
  defaultReps: number; defaultSets: number; defaultRestSec: number
}
interface ExerciseItem {
  id: string; exoId: string; name: string; category: ExoCategory
  sets: number; reps: number
  weightKg?: number; distanceM?: number; kcal?: number; targetTimeSec?: number
  restSec: number; notes?: string
}
interface ExoCircuit {
  id: string
  name: string
  type: string          // 'series' | 'lap' | 'superset' | 'emom' | 'tabata'
  rounds: number
  restBetweenRoundsSec: number
  targetTimeSec?: number
}

const EXO_CATEGORY_COLOR: Record<ExoCategory, string> = {
  push:  '#f97316',
  pull:  '#3b82f6',
  legs:  '#22c55e',
  mixte: '#a855f7',
  abdos: '#06b6d4',
  hyrox: '#ec4899',
}
const EXO_CATEGORY_LABEL: Record<ExoCategory, string> = {
  push:  'Push',
  pull:  'Pull',
  legs:  'Legs',
  mixte: 'Mixte',
  abdos: 'Abdos',
  hyrox: 'Hyrox',
}

const EXERCISE_DATABASE: ExoDefinition[] = [
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

function searchExercises(query: string, category?: ExoCategory): ExoDefinition[] {
  const q = query.toLowerCase().trim()
  if (!q && !category) return EXERCISE_DATABASE
  return EXERCISE_DATABASE.filter(exo => {
    if (category && exo.category !== category) return false
    if (!q) return true
    return exo.name.toLowerCase().includes(q) || exo.aliases.some(a => a.toLowerCase().includes(q))
  })
}

// ════════════════════════════════════════════════
// EXERCISE LIST BUILDER — Gym & Hyrox (circuit-based)
// ════════════════════════════════════════════════
function ExerciseListBuilder({ sport, exercises, onChange, onCircuitsChange }: {
  sport: SportType
  exercises: ExerciseItem[]
  onChange: (e: ExerciseItem[]) => void
  onCircuitsChange?: (circuits: ExoCircuit[], map: Record<string, string>) => void
}) {
  const defaultCircuit: ExoCircuit = { id: 'default', name: 'Séries 1', type: 'series', rounds: 3, restBetweenRoundsSec: 90 }
  const [circuits, setCircuits] = useState<ExoCircuit[]>([defaultCircuit])
  const [blockCircuitMap, setBlockCircuitMap] = useState<Record<string, string>>({})

  // Expose circuits + map dès qu'ils changent (pour SessionExecute et la sauvegarde)
  useEffect(() => {
    onCircuitsChange?.(circuits, blockCircuitMap)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuits, blockCircuitMap])
  const [addingToCircuit, setAddingToCircuit] = useState<string | null>(null)
  const [showCircuitTypeMenu, setShowCircuitTypeMenu] = useState(false)
  const [changingTypeFor, setChangingTypeFor] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<ExoCategory | undefined>(
    sport === 'hyrox' ? 'hyrox' : undefined
  )

  const accentColor = SPORT_BORDER[sport]

  const catOptions: { id: ExoCategory; label: string }[] = sport === 'hyrox'
    ? [{ id: 'hyrox', label: 'Hyrox' }]
    : [
        { id: 'push',  label: 'Push'  },
        { id: 'pull',  label: 'Pull'  },
        { id: 'legs',  label: 'Legs'  },
        { id: 'mixte', label: 'Mixte' },
        { id: 'abdos', label: 'Abdos' },
      ]

  const results = searchExercises(query, catFilter)

  function getBlocksForCircuit(circuitId: string): ExerciseItem[] {
    return exercises.filter(e => (blockCircuitMap[e.id] ?? 'default') === circuitId)
  }

  function addCircuit(typeId?: string) {
    const num = circuits.length + 1
    const ct = CIRCUIT_TYPES.find(c => c.id === typeId)
    const type = typeId ?? 'series'
    const name = ct ? `${ct.label} ${num}` : `Séries ${num}`
    const rounds = type === 'tabata' ? 8 : type === 'emom' ? 12 : 3
    const restBetweenRoundsSec = type === 'tabata' ? 10 : type === 'emom' ? 0 : 90
    const newCircuit: ExoCircuit = { id: `circuit_${Date.now()}`, name, type, rounds, restBetweenRoundsSec }
    setCircuits(prev => [...prev, newCircuit])
    setShowCircuitTypeMenu(false)
  }

  function removeCircuit(circuitId: string) {
    const toRemoveIds = exercises.filter(e => (blockCircuitMap[e.id] ?? 'default') === circuitId).map(e => e.id)
    onChange(exercises.filter(e => !toRemoveIds.includes(e.id)))
    setBlockCircuitMap(prev => {
      const next = { ...prev }
      toRemoveIds.forEach(id => delete next[id])
      return next
    })
    setCircuits(prev => prev.filter(c => c.id !== circuitId))
    if (addingToCircuit === circuitId) setAddingToCircuit(null)
  }

  function updateCircuit(circuitId: string, patch: Partial<ExoCircuit>) {
    setCircuits(prev => prev.map(c => c.id === circuitId ? { ...c, ...patch } : c))
  }

  function addExerciseToCircuit(exo: ExoDefinition, circuitId: string) {
    const item: ExerciseItem = {
      id: `exo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      exoId: exo.id,
      name: exo.name,
      category: exo.category,
      sets: exo.defaultSets,
      reps: exo.defaultReps,
      weightKg: exo.hasWeight ? 0 : undefined,
      distanceM: exo.hasDistance ? 0 : undefined,
      kcal: exo.hasKcal ? 0 : undefined,
      targetTimeSec: exo.hasTime ? 0 : undefined,
      restSec: exo.defaultRestSec,
    }
    onChange([...exercises, item])
    setBlockCircuitMap(prev => ({ ...prev, [item.id]: circuitId }))
    setAddingToCircuit(null)
    setQuery('')
  }

  function addCustomToCircuit(circuitId: string) {
    const q = query.trim()
    if (!q) return
    const item: ExerciseItem = {
      id: `exo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      exoId: 'custom',
      name: q,
      category: sport === 'hyrox' ? 'hyrox' : 'mixte',
      sets: 3, reps: 10, restSec: 60,
    }
    onChange([...exercises, item])
    setBlockCircuitMap(prev => ({ ...prev, [item.id]: circuitId }))
    setAddingToCircuit(null)
    setQuery('')
  }

  function updExo(id: string, field: keyof ExerciseItem, val: string | number | undefined) {
    onChange(exercises.map(e => e.id === id ? { ...e, [field]: val } : e))
  }

  function removeExo(id: string) {
    onChange(exercises.filter(e => e.id !== id))
    setBlockCircuitMap(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function moveExercise(blockId: string, dir: 'up' | 'down') {
    const idx = exercises.findIndex(e => e.id === blockId)
    if (idx < 0) return
    const circuitId = blockCircuitMap[blockId] ?? 'default'
    const circuitBlocks = exercises.filter(e => (blockCircuitMap[e.id] ?? 'default') === circuitId)
    const posInCircuit = circuitBlocks.findIndex(e => e.id === blockId)
    if (dir === 'up' && posInCircuit === 0) return
    if (dir === 'down' && posInCircuit === circuitBlocks.length - 1) return
    const swapWith = dir === 'up' ? circuitBlocks[posInCircuit - 1] : circuitBlocks[posInCircuit + 1]
    const swapIdx = exercises.findIndex(e => e.id === swapWith.id)
    const next = [...exercises]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    onChange(next)
  }

  function fmtTime(sec: number): string {
    if (!sec) return ''
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--input-bg)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none',
  }
  const accentInputStyle: React.CSSProperties = {
    ...inputStyle, border: `1px solid ${accentColor}44`, background: `${accentColor}08`,
  }

  return (
    <div>
      {circuits.map(circuit => {
        const circuitExercises = getBlocksForCircuit(circuit.id)
        return (
          <div key={circuit.id} style={{
            marginBottom: 16, borderRadius: 14,
            border: `1px solid ${accentColor}33`,
            background: 'var(--bg-card2)',
            overflow: 'hidden',
          }}>
            {/* En-tête circuit */}
            <div style={{ padding: '10px 14px', background: `${accentColor}12`, borderBottom: `1px solid ${accentColor}22` }}>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 8 }}>
                {/* Badge type — cliquable pour changer */}
                <button
                  onClick={() => setChangingTypeFor(changingTypeFor === circuit.id ? null : circuit.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 6, border: `1px solid ${accentColor}55`,
                    background: `${accentColor}22`, color: accentColor,
                    fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {CIRCUIT_TYPES.find(c => c.id === (circuit.type ?? 'series'))?.icon ?? '🔁'}{' '}
                  {CIRCUIT_TYPES.find(c => c.id === (circuit.type ?? 'series'))?.label ?? 'Séries'}
                  <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
                </button>
                <input
                  value={circuit.name}
                  onChange={e => updateCircuit(circuit.id, { name: e.target.value })}
                  style={{ flex: '1 1 80px', minWidth: 70, padding: '5px 8px', borderRadius: 7, border: `1px solid ${accentColor}44`, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 700, outline: 'none' }}
                />
                {(circuit.type ?? 'series') !== 'series' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' as const }}>Tours</span>
                    <input type="number" min={1} max={20} value={circuit.rounds}
                      onChange={e => updateCircuit(circuit.id, { rounds: parseInt(e.target.value) || 1 })}
                      style={{ width: 54, padding: '5px 6px', borderRadius: 7, border: `1px solid ${accentColor}44`, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none', textAlign: 'center' as const }} />
                  </div>
                )}
                {(circuit.type ?? 'series') !== 'series' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' as const }}>Repos/tour (s)</span>
                    <input type="number" min={0} step={15} value={circuit.restBetweenRoundsSec}
                      onChange={e => updateCircuit(circuit.id, { restBetweenRoundsSec: parseInt(e.target.value) || 0 })}
                      style={{ width: 64, padding: '5px 6px', borderRadius: 7, border: `1px solid ${accentColor}44`, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none', textAlign: 'center' as const }} />
                  </div>
                )}
                {sport === 'hyrox' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' as const }}>Temps cible (s)</span>
                    <input type="number" min={0} step={30} value={circuit.targetTimeSec ?? 0}
                      onChange={e => updateCircuit(circuit.id, { targetTimeSec: parseInt(e.target.value) || undefined })}
                      style={{ width: 70, padding: '5px 6px', borderRadius: 7, border: `1px solid ${accentColor}44`, background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Mono,monospace', outline: 'none', textAlign: 'center' as const }} />
                  </div>
                )}
                {circuits.length > 1 && (
                  <button onClick={() => removeCircuit(circuit.id)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}>×</button>
                )}
              </div>
              {/* Sélecteur de type inline */}
              {changingTypeFor === circuit.id && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {CIRCUIT_TYPES.map(ct => (
                    <button key={ct.id} onClick={() => {
                      updateCircuit(circuit.id, { type: ct.id })
                      setChangingTypeFor(null)
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 7,
                      border: (circuit.type ?? 'series') === ct.id ? `2px solid ${accentColor}` : '1px solid var(--border)',
                      background: (circuit.type ?? 'series') === ct.id ? `${accentColor}22` : 'var(--bg-card)',
                      color: (circuit.type ?? 'series') === ct.id ? accentColor : 'var(--text)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                      <span>{ct.icon}</span> {ct.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Exercices du circuit */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {circuitExercises.map((e, idx) => {
                const exoDef = EXERCISE_DATABASE.find(x => x.id === e.exoId)
                const catColor = EXO_CATEGORY_COLOR[e.category] ?? accentColor
                return (
                  <div key={e.id} style={{
                    borderRadius: 10, background: 'var(--bg-card)',
                    border: `1px solid ${accentColor}22`, borderLeft: `3px solid ${accentColor}`,
                    padding: '9px 12px',
                  }}>
                    {/* En-tête exercice */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      {/* Flèches réordonnancement */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                        <button onClick={() => moveExercise(e.id, 'up')}
                          disabled={idx === 0}
                          style={{ background: 'none', border: 'none', color: idx === 0 ? 'var(--border)' : 'var(--text-dim)', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 10, padding: '0 2px', lineHeight: 1 }}>▲</button>
                        <button onClick={() => moveExercise(e.id, 'down')}
                          disabled={idx === circuitExercises.length - 1}
                          style={{ background: 'none', border: 'none', color: idx === circuitExercises.length - 1 ? 'var(--border)' : 'var(--text-dim)', cursor: idx === circuitExercises.length - 1 ? 'default' : 'pointer', fontSize: 10, padding: '0 2px', lineHeight: 1 }}>▼</button>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace', flexShrink: 0 }}>#{idx + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{e.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: catColor, background: `${catColor}18`, padding: '2px 6px', borderRadius: 5, textTransform: 'uppercase' as const, flexShrink: 0 }}>
                        {EXO_CATEGORY_LABEL[e.category]}
                      </span>
                      <button onClick={() => removeExo(e.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                    {/* Champs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
                      {/* Séries uniquement pour le type "series" — les autres utilisent les tours/rounds du circuit */}
                      {(circuit.type ?? 'series') === 'series' && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Séries</p>
                          <input type="number" min={1} value={e.sets}
                            onChange={ev => updExo(e.id, 'sets', parseInt(ev.target.value) || 1)}
                            style={inputStyle} />
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Reps</p>
                        <input type="number" min={1} value={e.reps}
                          onChange={ev => updExo(e.id, 'reps', parseInt(ev.target.value) || 1)}
                          style={inputStyle} />
                      </div>
                      {(exoDef?.hasWeight ?? e.weightKg !== undefined) && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Charge (kg)</p>
                          <input type="number" min={0} step={2.5} value={e.weightKg ?? 0}
                            onChange={ev => updExo(e.id, 'weightKg', parseFloat(ev.target.value) || 0)}
                            style={accentInputStyle} />
                        </div>
                      )}
                      {(exoDef?.hasDistance ?? e.distanceM !== undefined) && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Distance (m)</p>
                          <input type="number" min={0} step={5} value={e.distanceM ?? 0}
                            onChange={ev => updExo(e.id, 'distanceM', parseInt(ev.target.value) || 0)}
                            style={accentInputStyle} />
                        </div>
                      )}
                      {(exoDef?.hasKcal ?? e.kcal !== undefined) && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Kcal cible</p>
                          <input type="number" min={0} value={e.kcal ?? 0}
                            onChange={ev => updExo(e.id, 'kcal', parseInt(ev.target.value) || 0)}
                            style={accentInputStyle} />
                        </div>
                      )}
                      {(exoDef?.hasTime ?? e.targetTimeSec !== undefined) && (
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Temps cible (sec)</p>
                          <input type="number" min={0} step={5} value={e.targetTimeSec ?? 0}
                            onChange={ev => updExo(e.id, 'targetTimeSec', parseInt(ev.target.value) || 0)}
                            style={accentInputStyle} />
                          {(e.targetTimeSec ?? 0) > 0 && (
                            <p style={{ fontSize: 10, color: accentColor, fontWeight: 600, margin: '4px 0 0', fontFamily: 'DM Mono,monospace' }}>{fmtTime(e.targetTimeSec ?? 0)}</p>
                          )}
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px' }}>Repos (sec)</p>
                        <input type="number" min={0} step={15} value={e.restSec}
                          onChange={ev => updExo(e.id, 'restSec', parseInt(ev.target.value) || 0)}
                          style={inputStyle} />
                      </div>
                    </div>
                    {/* Notes */}
                    <div style={{ marginTop: 6 }}>
                      <input value={e.notes ?? ''} onChange={ev => updExo(e.id, 'notes', ev.target.value)}
                        placeholder="Notes / consignes (optionnel)"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 11, outline: 'none' }} />
                    </div>
                  </div>
                )
              })}

              {/* Bouton ajouter ou panneau de recherche */}
              {addingToCircuit === circuit.id ? (
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-mid)',
                  borderRadius: 12, padding: '12px 14px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Ajouter un exercice</p>
                    <button onClick={() => { setAddingToCircuit(null); setQuery('') }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                  <input value={query} onChange={ev => setQuery(ev.target.value)}
                    placeholder="ex: squat, développé couché, traction..."
                    autoFocus
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none', marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                    {catOptions.map(cat => (
                      <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.id ? undefined : cat.id)}
                        style={{
                          padding: '3px 8px', borderRadius: 6, border: '1px solid', fontSize: 10, cursor: 'pointer',
                          borderColor: catFilter === cat.id ? accentColor : 'var(--border)',
                          background: catFilter === cat.id ? `${accentColor}22` : 'transparent',
                          color: catFilter === cat.id ? accentColor : 'var(--text-dim)',
                          fontWeight: catFilter === cat.id ? 700 : 400,
                        }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {results.slice(0, 20).map(exo => (
                      <button key={exo.id} onClick={() => addExerciseToCircuit(exo, circuit.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer',
                          textAlign: 'left' as const, width: '100%',
                        }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{exo.name}</span>
                          {exo.aliases[0] && <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 5 }}>({exo.aliases[0]})</span>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: EXO_CATEGORY_COLOR[exo.category], background: `${EXO_CATEGORY_COLOR[exo.category]}18`, padding: '2px 5px', borderRadius: 4, textTransform: 'uppercase' as const, flexShrink: 0 }}>
                          {EXO_CATEGORY_LABEL[exo.category]}
                        </span>
                      </button>
                    ))}
                    {results.length === 0 && (
                      <div style={{ padding: '10px', textAlign: 'center' as const }}>
                        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Aucun exercice trouvé pour &ldquo;{query}&rdquo;</p>
                        <button onClick={() => addCustomToCircuit(circuit.id)} style={{
                          padding: '7px 14px', borderRadius: 7,
                          background: `${accentColor}22`, border: `1px solid ${accentColor}`,
                          color: accentColor, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>+ Créer &ldquo;{query}&rdquo;</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingToCircuit(circuit.id); setQuery('') }} style={{
                  width: '100%', padding: '9px', borderRadius: 9,
                  background: 'transparent', border: `1px dashed ${accentColor}55`,
                  color: accentColor, fontSize: 12, cursor: 'pointer',
                }}>+ Ajouter un exercice</button>
              )}
            </div>
          </div>
        )
      })}

      {/* Bouton ajouter un circuit — avec sélecteur de type */}
      {!showCircuitTypeMenu ? (
        <button onClick={() => setShowCircuitTypeMenu(true)} style={{
          width: '100%', padding: '10px', borderRadius: 10,
          background: 'transparent', border: `2px dashed ${accentColor}44`,
          color: accentColor, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          marginTop: 4,
        }}>+ Ajouter un circuit</button>
      ) : (
        <div style={{
          marginTop: 4, padding: '12px 14px', borderRadius: 12,
          border: '1px solid var(--border)', background: 'var(--bg-card2)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', margin: '0 0 8px' }}>Quel type de circuit ?</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
            {CIRCUIT_TYPES.map(ct => (
              <button key={ct.id} onClick={() => addCircuit(ct.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                cursor: 'pointer', textAlign: 'left' as const, width: '100%',
              }}>
                <span style={{ fontSize: 14, width: 20, textAlign: 'center' as const, flexShrink: 0 }}>{ct.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{ct.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>{ct.desc}</span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowCircuitTypeMenu(false)} style={{
            marginTop: 8, width: '100%', padding: '7px', borderRadius: 6,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer',
          }}>Annuler</button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
// STRENGTH BLOCK RENDERER — muscu / hyrox
// Format : nom | séries × reps | charge | repos
// ════════════════════════════════════════════════
function StrengthBlockRenderer({ blocks, onChange, accent, exoHistory }: {
  blocks: Block[]; onChange: (b: Block[]) => void; accent: string
  exoHistory?: Record<string, { weight: string; reps: number; date: string }>
}) {
  const exoCount = (upToIdx: number) =>
    blocks.filter((x, j) => j <= upToIdx && x.type !== 'circuit_header').length

  // ── Ajout exercice depuis catalogue ──────────────────────────────
  const [addingToCircuit, setAddingToCircuit] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [catFilter, setCatFilter] = useState<ExoCategory | undefined>(undefined)
  const searchResults = searchExercises(searchQuery, catFilter)

  function insertExerciseAfterCircuit(circuitId: string, exo: ExoDefinition) {
    const circuitIdx = blocks.findIndex(x => x.id === circuitId)
    // Trouver la position d'insertion : après le dernier effort de ce circuit
    let insertIdx = circuitIdx + 1
    while (insertIdx < blocks.length && blocks[insertIdx].type !== 'circuit_header') {
      insertIdx++
    }
    const prev = exoHistory?.[exo.name.toLowerCase().trim()]
    const newBlock: Block = {
      id: `exo_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      mode: 'single' as BlockMode,
      type: 'effort' as BlockType,
      durationMin: 0,
      zone: 3,
      value: prev?.weight ?? '',
      hrAvg: '',
      label: exo.name,
      reps: prev?.reps ?? exo.defaultReps,
      recoveryMin: exo.defaultRestSec / 60,
      effortMin: 0,
    }
    const upd = [...blocks]
    upd.splice(insertIdx, 0, newBlock)
    onChange(upd)
    setAddingToCircuit(null)
    setSearchQuery('')
    setCatFilter(undefined)
  }

  function insertCustomAfterCircuit(circuitId: string, name: string) {
    const circuitIdx = blocks.findIndex(x => x.id === circuitId)
    let insertIdx = circuitIdx + 1
    while (insertIdx < blocks.length && blocks[insertIdx].type !== 'circuit_header') {
      insertIdx++
    }
    const newBlock: Block = {
      id: `exo_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      mode: 'single' as BlockMode, type: 'effort' as BlockType,
      durationMin: 0, zone: 3, value: '', hrAvg: '',
      label: name, reps: 10, recoveryMin: 1, effortMin: 0,
    }
    const upd = [...blocks]
    upd.splice(insertIdx, 0, newBlock)
    onChange(upd)
    setAddingToCircuit(null)
    setSearchQuery('')
    setCatFilter(undefined)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
      {blocks.map((b, i) => {
        // ── Circuit header ──
        if (b.type === 'circuit_header') {
          const circuitType: CircuitType = (['series','circuit','superset','emom','tabata'].includes(b.mode) ? b.mode : 'series') as CircuitType
          const isEmom    = circuitType === 'emom'
          const isTabata  = circuitType === 'tabata'
          const noRest    = isEmom || isTabata
          return (
            <div key={b.id} style={{ marginTop: i > 0 ? 20 : 0, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              {/* Ligne 1 : point + type badge + nom + quantité + repos + ×  */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: accent, background: `${accent}18`, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                  {CIRCUIT_TYPES.find(c => c.id === circuitType)?.label ?? 'Séries'}
                </span>
                <input value={b.label} onChange={e => {
                  const upd = [...blocks]; upd[i] = { ...b, label: e.target.value }; onChange(upd)
                }} style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne, sans-serif', minWidth: 0,
                }} />
                {/* Quantité : rounds ou minutes (uniquement pour les circuits non-series) */}
                {circuitType !== 'series' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input type="number" min={1} max={60}
                      value={isEmom ? (b.durationMin || 12) : (b.zone ?? (isTabata ? 8 : 3))}
                      onChange={e => {
                        const upd = [...blocks]
                        if (isEmom) upd[i] = { ...b, durationMin: parseInt(e.target.value) || 12 }
                        else upd[i] = { ...b, zone: parseInt(e.target.value) || 1 }
                        onChange(upd)
                      }}
                      style={{ width: 38, padding: '3px 6px', borderRadius: 5, border: `1px solid ${accent}44`, background: `${accent}08`, color: accent, fontSize: 12, fontFamily: '"DM Mono",monospace', textAlign: 'center' as const, outline: 'none' }} />
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{isEmom ? 'min' : 'tours'}</span>
                  </div>
                )}
                {/* Repos (sauf EMOM/tabata) */}
                {!noRest && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input type="number" min={0} max={600} step={15}
                      value={b.recoveryMin != null ? Math.round(b.recoveryMin * 60) : 90}
                      onChange={e => { const upd = [...blocks]; upd[i] = { ...b, recoveryMin: (parseInt(e.target.value) || 0) / 60 }; onChange(upd) }}
                      style={{ width: 42, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)', fontSize: 12, fontFamily: '"DM Mono",monospace', textAlign: 'center' as const, outline: 'none' }} />
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>s repos</span>
                  </div>
                )}
                <button onClick={() => onChange(blocks.filter((_, j) => j !== i))} style={{
                  background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                }}>×</button>
              </div>
              {/* Ligne 2 : chips de type */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, paddingLeft: 14 }}>
                {CIRCUIT_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => {
                    const upd = [...blocks]
                    upd[i] = {
                      ...b, mode: ct.id,
                      zone: ct.id === 'tabata' ? 8 : ct.id === 'emom' ? 1 : (b.zone ?? 3),
                      durationMin: ct.id === 'emom' ? (b.durationMin || 12) : 0,
                      recoveryMin: ct.id === 'tabata' || ct.id === 'emom' ? 0 : (b.recoveryMin ?? 1.5),
                    }
                    onChange(upd)
                  }} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                    background: circuitType === ct.id ? `${accent}15` : 'transparent',
                    border: circuitType === ct.id ? `1px solid ${accent}55` : '1px solid var(--border)',
                    color: circuitType === ct.id ? accent : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 10 }}>{ct.icon}</span>{ct.label}
                  </button>
                ))}
              </div>
              {/* ── Ajouter un exercice au circuit ── */}
              {addingToCircuit === b.id ? (
                <div style={{ marginTop: 10, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Ajouter un exercice</span>
                    <button onClick={() => { setAddingToCircuit(null); setSearchQuery(''); setCatFilter(undefined) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                  </div>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ex: squat, développé couché, traction..."
                    autoFocus
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--input-bg,var(--bg-card2))', color: 'var(--text)', fontSize: 12, outline: 'none', marginBottom: 7, boxSizing: 'border-box' as const }} />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 7 }}>
                    {([{ id: 'push', label: 'Push' }, { id: 'pull', label: 'Pull' }, { id: 'legs', label: 'Legs' }, { id: 'mixte', label: 'Mixte' }, { id: 'abdos', label: 'Abdos' }] as { id: ExoCategory; label: string }[]).map(cat => (
                      <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.id ? undefined : cat.id)} style={{
                        padding: '2px 7px', borderRadius: 5, border: '1px solid', fontSize: 9, cursor: 'pointer', fontWeight: 600,
                        borderColor: catFilter === cat.id ? accent : 'var(--border)',
                        background: catFilter === cat.id ? `${accent}22` : 'transparent',
                        color: catFilter === cat.id ? accent : 'var(--text-dim)',
                      }}>{cat.label}</button>
                    ))}
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
                    {searchResults.slice(0, 20).map(exo => (
                      <button key={exo.id} onClick={() => insertExerciseAfterCircuit(b.id, exo)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer',
                        textAlign: 'left' as const, width: '100%',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{exo.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: EXO_CATEGORY_COLOR[exo.category], background: `${EXO_CATEGORY_COLOR[exo.category]}18`, padding: '2px 5px', borderRadius: 4, textTransform: 'uppercase' as const, flexShrink: 0 }}>
                          {EXO_CATEGORY_LABEL[exo.category]}
                        </span>
                      </button>
                    ))}
                    {searchResults.length === 0 && searchQuery.trim() && (
                      <div style={{ padding: '8px', textAlign: 'center' as const }}>
                        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>Aucun résultat pour &ldquo;{searchQuery}&rdquo;</p>
                        <button onClick={() => insertCustomAfterCircuit(b.id, searchQuery.trim())} style={{
                          padding: '6px 12px', borderRadius: 6, background: `${accent}22`,
                          border: `1px solid ${accent}`, color: accent, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}>+ Créer &ldquo;{searchQuery.trim()}&rdquo;</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingToCircuit(b.id); setSearchQuery(''); setCatFilter(undefined) }} style={{
                  width: '100%', marginTop: 8, padding: '7px', borderRadius: 7,
                  background: 'transparent', border: `1px dashed ${accent}44`,
                  color: accent, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                }}>+ Ajouter un exercice</button>
              )}
            </div>
          )
        }

        // ── Flèche de chaîne (repos ≤ 30s avec l'exo précédent) ──
        const prevBlock = i > 0 ? blocks[i - 1] : null
        const isChained = !!(prevBlock && prevBlock.type !== 'circuit_header' && (prevBlock.recoveryMin ?? 0) * 60 <= 30)
        // Type du circuit parent (pour masquer "Séries" en mode lap/superset/etc.)
        const parentHeader = [...blocks].slice(0, i).reverse().find(x => x.type === 'circuit_header')
        const parentCircuitType: CircuitType = (parentHeader && (['series','circuit','superset','emom','tabata'].includes(parentHeader.mode)) ? parentHeader.mode : 'series') as CircuitType
        const isSeries = parentCircuitType === 'series'

        return (
          <div key={b.id}>
            {isChained && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', color: accent, opacity: 0.5 }}>
                  <div style={{ width: 1, height: 8, background: accent }} />
                  <span style={{ fontSize: 10, lineHeight: 1 }}>▼</span>
                </div>
              </div>
            )}

            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: isChained ? 0 : 6,
              border: '1px solid var(--border)', background: 'var(--bg-card2)',
            }}>
              {/* Ligne 1 : numéro + nom + supprimer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: '"DM Mono", monospace', width: 18, flexShrink: 0 }}>{exoCount(i)}</span>
                <input value={b.label} onChange={e => {
                  const upd = [...blocks]; upd[i] = { ...b, label: e.target.value }; onChange(upd)
                }} style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 14, fontWeight: 700, color: 'var(--text)', minWidth: 0,
                }} />
                <button onClick={() => onChange(blocks.filter((_, j) => j !== i))} style={{
                  background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
                }}>×</button>
              </div>
              {/* Historique exo */}
              {(() => {
                if (!exoHistory) return null
                const key = (b.label ?? '').toLowerCase().trim()
                const hist = exoHistory[key]
                if (!hist) return null
                const dateStr = hist.date ? new Date(hist.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''
                return (
                  <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 6px 18px', fontStyle: 'italic' as const }}>
                    Dernière : {hist.weight}kg × {hist.reps}{dateStr ? ` (${dateStr})` : ''}
                  </p>
                )
              })()}

              {/* Ligne 2 : séries × reps | charge | repos */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                {/* Séries — uniquement pour circuit de type "series" */}
                {isSeries && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Séries</span>
                    <input type="number" min={1} max={20} value={b.zone ?? 3}
                      onChange={e => { const upd = [...blocks]; upd[i] = { ...b, zone: parseInt(e.target.value) || 1 }; onChange(upd) }}
                      style={{ width: 40, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: '"DM Mono", monospace', textAlign: 'center' as const, outline: 'none' }} />
                  </div>
                )}

                {isSeries && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>×</span>}

                {/* Reps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Reps</span>
                  <input type="number" min={0} max={200} value={b.reps ?? 10}
                    onChange={e => { const upd = [...blocks]; upd[i] = { ...b, reps: parseInt(e.target.value) || 0 }; onChange(upd) }}
                    style={{ width: 44, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: '"DM Mono", monospace', textAlign: 'center' as const, outline: 'none' }} />
                </div>

                {/* Charge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Charge</span>
                  <input value={b.value || ''} placeholder="—"
                    onChange={e => { const upd = [...blocks]; upd[i] = { ...b, value: e.target.value }; onChange(upd) }}
                    style={{ width: 56, padding: '4px 6px', borderRadius: 6, border: `1px solid ${accent}44`, background: `${accent}08`, color: accent, fontSize: 13, fontFamily: '"DM Mono", monospace', textAlign: 'center' as const, fontWeight: 700, outline: 'none' }} />
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>kg</span>
                </div>

                {/* Repos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Repos</span>
                  <input type="number" min={0} max={600} step={15}
                    value={b.recoveryMin != null ? Math.round(b.recoveryMin * 60) : 90}
                    onChange={e => { const upd = [...blocks]; upd[i] = { ...b, recoveryMin: (parseInt(e.target.value) || 0) / 60 }; onChange(upd) }}
                    style={{ width: 48, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: '"DM Mono", monospace', textAlign: 'center' as const, outline: 'none' }} />
                  <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>s</span>
                </div>

                {/* Temps (gainage, etc.) */}
                {(b.effortMin ?? 0) > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>Temps</span>
                    <span style={{ fontSize: 13, fontFamily: '"DM Mono", monospace', color: accent, fontWeight: 600 }}>
                      {Math.round((b.effortMin ?? 0) * 60)}s
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Saisie allure/watts : helpers + champ stepper (− / valeur / +) ──
function paceToSec(s: string): number { const m = (s || '').match(/^(\d+):(\d{1,2})$/); return m ? (+m[1]) * 60 + (+m[2]) : NaN }
function secToPace(n: number): string { const x = Math.max(0, Math.round(n)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}` }
// Incrémente une allure mm:ss de ±5s, ou une valeur numérique (watts) de ±5.
function bumpPaceOrWatts(v: string, steps: number): string {
  const sec = paceToSec(v)
  if (!isNaN(sec)) return secToPace(sec + steps * 5)
  const n = parseInt(v || '0') || 0
  return String(Math.max(0, n + steps * 5))
}
// Durée affichée en m:ss (durationMin = minutes décimales). Pas de 15 s.
function durMMSS(min: number): string { const s = Math.max(0, Math.round((min || 0) * 60)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
function mmssToMin(v: string): number { const m = (v || '').match(/^(\d+):(\d{1,2})$/); if (m) return (+m[1]) + (+m[2]) / 60; const n = parseFloat(v || '0'); return isNaN(n) ? 0 : n }
function bumpDurSec(min: number, steps: number): number { const s = Math.max(0, Math.round((min || 0) * 60) + steps * 15); return Math.round(s) / 60 }
// Estimation SM (métabolique) / SN (neuromusculaire) « prévu » depuis les blocs (déterministe,
// proxy par zone — l'app calcule le réel sur l'activité terminée). Remplace l'ancien TSS.
const SM_COEF = [0.6, 0.85, 1.05, 1.25, 1.45, 1.55, 1.62]
const SN_COEF = [0, 0, 0.08, 0.25, 0.6, 1.1, 1.7]
function estimateSmSn(blocks: { mode?: string; zone?: number; durationMin?: number; reps?: number; effortMin?: number; recoveryMin?: number }[], durationMin: number): { sm: number; sn: number } {
  let sm = 0, sn = 0, acc = 0
  for (const b of blocks) {
    const z = Math.max(1, Math.min(7, b.zone || 1))
    const isIv = b.mode === 'interval' && !!b.reps && b.effortMin != null
    const totMin = isIv ? (b.reps as number) * ((b.effortMin as number) + (b.recoveryMin || 0)) : (b.durationMin || 0)
    const effMin = isIv ? (b.reps as number) * (b.effortMin as number) : (b.durationMin || 0)
    sm += totMin * SM_COEF[z - 1]
    sn += effMin * SN_COEF[z - 1]
    acc += totMin
  }
  if (acc === 0 && durationMin > 0) sm = durationMin
  return { sm: Math.round(sm), sn: Math.round(sn) }
}

function StepperField({ label, unit, value, onChange, onDec, onInc, color = 'var(--text)', placeholder, headerRight }: {
  label: string; unit?: string; value: string; onChange: (v: string) => void; onDec: () => void; onInc: () => void
  color?: string; placeholder?: string; headerRight?: React.ReactNode
}) {
  const btn: React.CSSProperties = { width: 28, flexShrink: 0, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontSize: 17, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', padding: 0 }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, minHeight: 14 }}>
        <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>{label}</p>
        {headerRight}
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', height: 34 }}>
        <button type="button" onClick={onDec} style={{ ...btn, borderRadius: '8px 0 0 8px', borderRight: 'none' }}>−</button>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
          <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
            style={{ width: '100%', minWidth: 0, textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', color, fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', padding: unit ? '0 16px 0 4px' : '0 4px' }} />
          {unit && <span style={{ position: 'absolute', right: 5, fontSize: 8.5, color: 'var(--text-dim)', pointerEvents: 'none' }}>{unit}</span>}
        </div>
        <button type="button" onClick={onInc} style={{ ...btn, borderRadius: '0 8px 8px 0', borderLeft: 'none' }}>+</button>
      </div>
    </div>
  )
}

function BlockBuilder({ sport, blocks, onChange, nutritionItems, exoHistory, athleteData }: {
  sport: SportType; blocks: Block[]; onChange: (b: Block[]) => void
  nutritionItems?: Array<{ timeMin: number; name: string; type: string; glucidesG: number }>
  exoHistory?: Record<string, { weight: string; reps: number; date: string }>
  athleteData?: { ftp: number | null } | null
}) {
  const vLabel = sport === 'bike' ? 'Watts' : sport === 'swim' ? 'Allure /100m' : 'Allure /km'
  const vPlh   = sport === 'bike' ? '250' : sport === 'swim' ? '1:35' : '4:30'
  const isStrengthSportBB = sport === 'gym' || sport === 'hyrox'
  const accentBB = SPORT_BORDER[sport]
  const ftp = athleteData?.ftp ?? null

  const [hoveredBar,     setHoveredBar]     = useState<{ x: number; y: number; block: Block; isRecovery: boolean } | null>(null)
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null)
  const [dragIdx,        setDragIdx]        = useState<number | null>(null)
  const [dragOverIdx,    setDragOverIdx]    = useState<number | null>(null)
  const [ftpPctMode,     setFtpPctMode]     = useState<Record<string, boolean>>({})
  const [showCircuitMenu, setShowCircuitMenu] = useState(false)

  // ── 7-zone design system ──
  const ZONE_GRAD = [
    'linear-gradient(0deg,#9CA3AF,#D1D5DB)',
    'linear-gradient(0deg,#16A34A,#4ADE80)',
    'linear-gradient(0deg,#CA8A04,#FDE047)',
    'linear-gradient(0deg,#EA580C,#FB923C)',
    'linear-gradient(0deg,#DC2626,#F87171)',
    'linear-gradient(0deg,#9333EA,#C084FC)',
    'linear-gradient(0deg,#1D4ED8,#60A5FA)',
  ]
  const ZONE_COL = ['#9CA3AF','#16A34A','#CA8A04','#EA580C','#DC2626','#9333EA','#1D4ED8']
  const ZONE_H   = [8, 12, 16, 20, 24, 28, 32]  // px height per zone (skyline)
  const ZONE_NMS = ['Récup','Aérobie','Tempo','Seuil','VO2max','Anaérobie','Sprint']
  const zc  = (z: number) => ZONE_COL[Math.max(0, Math.min(6, z - 1))]
  const zg  = (z: number) => ZONE_GRAD[Math.max(0, Math.min(6, z - 1))]
  const zh  = (z: number) => ZONE_H[Math.max(0, Math.min(6, z - 1))]
  const znm = (z: number) => ZONE_NMS[Math.max(0, Math.min(6, z - 1))]

  function addSingle() {
    onChange([...blocks, { id: `b_${Date.now()}`, mode: 'single', type: 'effort', durationMin: 10, zone: 3, value: sport === 'bike' ? '220' : '4:30', hrAvg: '', label: 'Bloc' }])
  }
  function addInterval() {
    onChange([...blocks, { id: `b_${Date.now()}`, mode: 'interval', type: 'effort', durationMin: 0, zone: 4, value: '', hrAvg: '', label: '', reps: 5, effortMin: 4, recoveryMin: 1, recoveryZone: 1 }])
  }
  function upd(id: string, field: keyof Block, val: string | number) {
    onChange(blocks.map(b => {
      if (b.id !== id) return b
      const u: Block = { ...b, [field]: val }
      if (field === 'value') u.zone = getZone(sport, String(val))
      if (u.mode === 'interval' && u.reps && u.effortMin != null && u.recoveryMin != null)
        u.durationMin = u.reps * (u.effortMin + u.recoveryMin)
      return u
    }))
  }
  function duplicate(bi: number) {
    const copy = { ...blocks[bi], id: `b_${Date.now()}` }
    const nb = [...blocks]; nb.splice(bi + 1, 0, copy); onChange(nb)
  }
  function changeType(id: string, newType: string) {
    const autoZone: Partial<Record<string, number>> = { warmup: 1, recovery: 1, cooldown: 1 }
    onChange(blocks.map(b => b.id !== id ? b : { ...b, type: newType as BlockType, zone: autoZone[newType] ?? b.zone }))
  }
  function dropBlock(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    const nb = [...blocks]; const [m] = nb.splice(fromIdx, 1); nb.splice(toIdx, 0, m); onChange(nb)
  }
  function getTimeRange(min: number): string {
    if (min <= 0) return ''
    const sec = Math.round(min * 60)
    const lo = sec - Math.round(sec * 0.03), hi = sec + Math.round(sec * 0.03)
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    return `${fmt(lo)} à ${fmt(hi)}`
  }

  type Bar = { id: string; min: number; zone: number; isRecovery: boolean; block: Block }
  const bars: Bar[] = []
  for (const b of blocks) {
    if (b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin) {
      for (let r = 0; r < b.reps; r++) {
        bars.push({ id: `${b.id}_e${r}`, min: b.effortMin, zone: b.zone, isRecovery: false, block: b })
        if (b.recoveryMin > 0) bars.push({ id: `${b.id}_r${r}`, min: b.recoveryMin, zone: b.recoveryZone ?? 1, isRecovery: true, block: b })
      }
    } else {
      bars.push({ id: b.id, min: b.durationMin, zone: b.zone, isRecovery: false, block: b })
    }
  }
  const totalMin = bars.reduce((s, bar) => s + bar.min, 0) || 1
  const totalBlocks = blocks.reduce((s, b) => {
    if (b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin) return s + b.reps * (b.effortMin + b.recoveryMin)
    return s + b.durationMin
  }, 0)

  // ── Métriques header ──
  const tssCurrent = computeTSSRange(blocks, sport, totalBlocks, 5, null).high
  const smsnBB = estimateSmSn(blocks, totalBlocks)
  const npWatts = (() => {
    if (sport !== 'bike' || blocks.length === 0) return null
    const IF_Z = [0.55,0.70,0.83,0.95,1.10,1.20,1.35]
    let sumWM = 0, sumM = 0
    for (const b of blocks) {
      const ifv = IF_Z[Math.max(0,Math.min(6,b.zone-1))]
      const m = b.mode === 'interval' && b.reps && b.effortMin ? b.reps * b.effortMin : b.durationMin
      const w = parseInt(b.value || '0') || (ftp ? Math.round(ftp * ifv) : 0)
      sumWM += w * m; sumM += m
    }
    return sumM > 0 ? Math.round(sumWM / sumM) : null
  })()
  const ifVal = (npWatts && ftp) ? (npWatts / ftp).toFixed(2) : null
  const dominantZone = (() => {
    const zm = new Array(7).fill(0); for (const bar of bars) zm[Math.max(0,Math.min(6,bar.zone-1))] += bar.min
    return zm.indexOf(Math.max(...zm)) + 1
  })()
  const tssLevel = tssCurrent < 50 ? 'Récup' : tssCurrent < 100 ? 'Modéré' : tssCurrent < 150 ? 'Chargé' : 'Très chargé'
  const tssGaugeColor = tssCurrent < 50 ? '#10B981' : tssCurrent < 100 ? '#3B82F6' : tssCurrent < 150 ? '#F97316' : '#EF4444'
  const tssGaugePct = Math.min(100, (tssCurrent / 200) * 100)
  const hasFC = bars.some(bar => parseInt(bar.block.hrAvg ?? '') > 0)

  return (
    <div>
      {/* ══ TSS HEADER + BARRE D'INTENSITÉ ══ */}
      {!isStrengthSportBB && blocks.length > 0 && (
        <div style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', marginBottom: 14, overflow: 'hidden' }}>
          {/* 3-metric row */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1, padding: '11px 14px', textAlign: 'center' as const }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', margin: '0 0 2px' }}>SM<span style={{ fontSize: 8, color: 'var(--text-dim)' }}> métab.</span></p>
              <p style={{ fontSize: 19, fontWeight: 700, color: '#06B6D4', fontFamily: 'var(--font-display)', margin: 0 }}>{smsnBB.sm}</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' as const }} />
            <div style={{ flex: 1, padding: '11px 14px', textAlign: 'center' as const }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', margin: '0 0 2px' }}>SN<span style={{ fontSize: 8, color: 'var(--text-dim)' }}> neuro.</span></p>
              <p style={{ fontSize: 19, fontWeight: 700, color: '#8B5CF6', fontFamily: 'var(--font-display)', margin: 0 }}>{smsnBB.sn}</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' as const }} />
            <div style={{ flex: 1, padding: '11px 14px', textAlign: 'center' as const }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', margin: '0 0 2px' }}>Durée</p>
              <p style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', margin: 0 }}>{formatHM(Math.round(totalBlocks))}</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' as const }} />
            <div style={{ flex: 1, padding: '11px 14px', textAlign: 'center' as const }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'var(--text-dim)', margin: '0 0 2px' }}>Intensité Moy.</p>
              <p style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', margin: 0 }}>
                {npWatts ? `${npWatts}W` : '—'}
                {ifVal && <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>IF {ifVal}</span>}
              </p>
            </div>
          </div>
          {/* TSS gauge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px 0' }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ width: `${tssGaugePct}%`, height: '100%', background: tssGaugeColor, borderRadius: 2, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: tssGaugeColor, flexShrink: 0, minWidth: 58, textAlign: 'right' as const }}>{tssLevel}</span>
          </div>
          {/* Skyline intensity bar */}
          <div style={{ position: 'relative', padding: '10px 14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 32 }}>
              {bars.map((bar, bIdx) => {
                const wp   = (bar.min / totalMin) * 100
                const h    = bar.isRecovery ? 4 : zh(bar.zone)
                const isHv = hoveredBar?.block.id === bar.block.id
                return (
                  <div key={bar.id}
                    onMouseEnter={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setHoveredBar({ x: rect.left + rect.width / 2, y: rect.top, block: bar.block, isRecovery: bar.isRecovery })
                      setHoveredBlockId(bar.block.id)
                    }}
                    onMouseLeave={() => { setHoveredBar(null); setHoveredBlockId(null) }}
                    style={{
                      width: `${wp}%`, minWidth: 2, height: h, flexShrink: 0,
                      background: bar.isRecovery ? 'rgba(156,163,175,0.25)' : zg(bar.zone),
                      borderRadius: '4px 4px 0 0',
                      borderRight: bIdx < bars.length - 1 ? '1px solid rgba(255,255,255,0.45)' : 'none',
                      transform: isHv ? 'translateY(-2px)' : 'none',
                      transition: 'transform 0.12s',
                      cursor: 'pointer',
                    }}
                  />
                )
              })}
            </div>
            {/* FC gauge line */}
            {hasFC && (
              <div style={{ display: 'flex', height: 4, marginTop: 2 }}>
                {bars.map(bar => {
                  const hr = parseInt(bar.block.hrAvg ?? '') || 0
                  const col = hr <= 0 ? 'transparent' : hr < 130 ? '#9CA3AF' : hr < 145 ? '#10B981' : hr < 160 ? '#FBBF24' : hr < 175 ? '#F97316' : '#EF4444'
                  return <div key={`fc_${bar.id}`} style={{ flex: bar.min, background: col, opacity: hr > 0 ? 0.75 : 0 }} />
                })}
              </div>
            )}
            {/* Nutrition overlays */}
            {(nutritionItems ?? []).filter(m => m.timeMin > 0).map((m, i) => {
              const leftPct = (m.timeMin / totalMin) * 100
              if (leftPct > 100 || leftPct < 0) return null
              const accentCol = SPORT_BORDER[sport]
              return (
                <div key={`nut_${i}`} style={{ position: 'absolute' as const, left: `${leftPct}%`, top: 0, bottom: 0, pointerEvents: 'none' as const, zIndex: 5, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                  <div style={{ position: 'absolute' as const, bottom: '100%', marginBottom: 2, whiteSpace: 'nowrap' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                    <span style={{ fontSize: 7, fontWeight: 700, color: accentCol, opacity: 0.85, lineHeight: 1.2 }}>{m.name || m.type}</span>
                    <span style={{ fontSize: 6.5, color: 'var(--text-dim)', opacity: 0.65, fontFamily: 'DM Mono,monospace' }}>{m.glucidesG}g</span>
                  </div>
                  <div style={{ width: 1, height: '100%', background: `repeating-linear-gradient(to bottom,${accentCol}99 0px,${accentCol}99 3px,transparent 3px,transparent 6px)` }} />
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: accentCol, opacity: 0.7, flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
          {/* Zone legend */}
          <div style={{ padding: '6px 14px 10px', display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {(() => {
              const used = new Set(bars.map(b => b.zone))
              return ZONE_NMS.map((nm, i) => used.has(i + 1) && (
                <span key={i} style={{ fontSize: 9, fontWeight: 700, color: ZONE_COL[i], display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: ZONE_COL[i], display: 'inline-block' }} />
                  Z{i + 1} {nm}
                </span>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredBar && !hoveredBar.isRecovery && (
        <div style={{ position: 'fixed' as const, zIndex: 1100, left: hoveredBar.x, top: hoveredBar.y - 8, transform: 'translate(-50%,-100%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', pointerEvents: 'none' as const, whiteSpace: 'nowrap' as const, fontSize: 11 }}>
          <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{hoveredBar.block.label}</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, color: 'var(--text-dim)' }}>
            <span>Durée : <strong style={{ fontFamily: 'DM Mono,monospace' }}>{hoveredBar.block.mode === 'interval' && hoveredBar.block.effortMin ? fmtDuration(hoveredBar.block.effortMin) : fmtDuration(hoveredBar.block.durationMin)}</strong></span>
            <span>Zone : <strong style={{ color: zc(hoveredBar.block.zone) }}>Z{hoveredBar.block.zone} — {znm(hoveredBar.block.zone)}</strong></span>
            {hoveredBar.block.value && <span>{sport === 'bike' ? 'Puissance' : 'Allure'} : <strong style={{ fontFamily: 'DM Mono,monospace' }}>{hoveredBar.block.value}{sport === 'bike' ? 'W' : '/km'}</strong></span>}
            {hoveredBar.block.hrAvg && parseInt(hoveredBar.block.hrAvg) > 0 && <span>FC moy : <strong style={{ fontFamily: 'DM Mono,monospace' }}>{hoveredBar.block.hrAvg} bpm</strong></span>}
          </div>
        </div>
      )}

      {/* ══ GUIDE CIRCUITS (gym/hyrox) ══ */}
      {isStrengthSportBB && (
        <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: `${accentBB}07`, border: `1px solid ${accentBB}18` }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', margin: '0 0 7px' }}>Types de circuits</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
            {CIRCUIT_TYPES.map(ct => (
              <div key={ct.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, fontFamily: '"DM Mono",monospace', color: accentBB, fontWeight: 700, minWidth: 18, flexShrink: 0 }}>{ct.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', minWidth: 58, flexShrink: 0 }}>{ct.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{ct.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ LISTE DES BLOCS ══ */}
      {(sport === 'gym' || sport === 'hyrox') ? (
        <div style={{ marginBottom: 10 }}>
          <StrengthBlockRenderer blocks={blocks} onChange={onChange} accent={SPORT_BORDER[sport]} exoHistory={exoHistory} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
          {blocks.map((b, bi) => {
            const isDragging = dragIdx === bi
            const isDragOver = dragOverIdx === bi && dragIdx !== bi
            const dragProps = {
              draggable: true,
              onDragStart: () => setDragIdx(bi),
              onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverIdx(bi) },
              onDrop: () => { if (dragIdx !== null) dropBlock(dragIdx, bi); setDragIdx(null); setDragOverIdx(null) },
              onDragEnd: () => { setDragIdx(null); setDragOverIdx(null) },
            }

            // ── Circuit header ──
            if (b.type === 'circuit_header') {
              const cc = SPORT_BORDER[sport]
              return (
                <div key={b.id} {...dragProps} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: `${cc}08`, border: `1px solid ${cc}22`, borderLeft: `4px solid ${cc}`, opacity: isDragging ? 0.5 : 1, outline: isDragOver ? `2px solid ${cc}` : 'none' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke={cc} strokeWidth="1.5"/><path d="M3.5 5L4.5 6L6.5 4" stroke={cc} strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <input value={b.label} onChange={e => onChange(blocks.map((x,j)=>j===bi?{...x,label:e.target.value}:x))} style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'Syne,sans-serif', minWidth:0 }} />
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <input type="number" min={1} max={20} value={b.zone??3} onChange={e=>onChange(blocks.map((x,j)=>j===bi?{...x,zone:parseInt(e.target.value)||3}:x))} style={{ width:36,padding:'3px 5px',borderRadius:5,border:'1px solid var(--border)',background:'var(--bg-card2)',color:cc,fontSize:12,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
                      <span style={{fontSize:10,color:'var(--text-dim)'}}>rounds</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <input type="number" min={0} max={10} step={0.5} value={b.recoveryMin??2} onChange={e=>onChange(blocks.map((x,j)=>j===bi?{...x,recoveryMin:parseFloat(e.target.value)||0}:x))} style={{ width:42,padding:'3px 5px',borderRadius:5,border:'1px solid var(--border)',background:'var(--bg-card2)',color:'var(--text-dim)',fontSize:12,fontFamily:'"DM Mono",monospace',textAlign:'center' as const,outline:'none' }}/>
                      <span style={{fontSize:10,color:'var(--text-dim)'}}>min repos</span>
                    </div>
                  </div>
                  <button onClick={() => duplicate(bi)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:12, padding:'0 2px' }} title="Dupliquer">📋</button>
                  <button onClick={()=>onChange(blocks.filter((_,j)=>j!==bi))} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:16, lineHeight:1, padding:'0 2px' }}>×</button>
                </div>
              )
            }

            // ── Bloc Interval ──
            if (b.mode === 'interval' && !!b.reps && !!b.effortMin) {
              const col = zc(b.zone)
              const recovSec = Math.round((b.recoveryMin ?? 0) * 60)
              const recovFmt = `${Math.floor(recovSec/60)}:${String(recovSec%60).padStart(2,'0')}`
              const effortRange = getTimeRange(b.effortMin ?? 0)
              const isHov = hoveredBlockId === b.id
              return (
                <div key={b.id} {...dragProps}
                  onMouseEnter={() => setHoveredBlockId(b.id)} onMouseLeave={() => setHoveredBlockId(null)}
                  style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', opacity: isDragging ? 0.5 : 1, outline: isDragOver ? '2px solid var(--primary)' : 'none', borderColor: isHov ? 'var(--border-mid)' : 'var(--border)', transition: 'border-color 0.12s' }}>
                  {/* Header */}
                  <div style={{ background: 'var(--bg-card2)', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, background: `${col}1A`, color: col, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Z{b.zone}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', background: 'var(--bg-elev)', padding: '3px 8px', borderRadius: 6, flexShrink: 0, letterSpacing: '0.04em' }}>INTERVAL</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{b.reps}× {b.label || `${Math.round((b.effortMin??0)*10)/10}min`}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>{formatHM(Math.round((b.reps??1)*((b.effortMin??0)+(b.recoveryMin??0))))}</span>
                    <button onClick={() => duplicate(bi)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:12, padding:'0 3px', flexShrink:0 }} title="Dupliquer">📋</button>
                    <button onClick={() => onChange(blocks.filter(x => x.id !== b.id))} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, lineHeight:1, padding:'0 2px', flexShrink:0, color:'var(--text-dim)' }}>×</button>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '10px 12px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }}>Effort</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(90px,1fr))', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px', textTransform: 'uppercase' as const }}>Répétitions</p>
                          <input type="number" min={1} value={b.reps??5} onChange={e=>upd(b.id,'reps',parseInt(e.target.value)||1)} style={{ width:'100%', padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, fontFamily:'var(--font-display)', fontWeight:700, outline:'none' }}/>
                        </div>
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px', textTransform: 'uppercase' as const }}>Durée</p>
                          <input value={durMMSS(b.effortMin??0)} onChange={e=>upd(b.id,'effortMin',mmssToMin(e.target.value))} placeholder="4:00" style={{ width:'100%', padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, fontFamily:'var(--font-display)', fontWeight:700, outline:'none' }}/>
                          {effortRange && sport !== 'bike' && <p style={{ fontSize:9, color:'var(--text-dim)', margin:'2px 0 0', fontFamily:'var(--font-display)' }}>{effortRange}</p>}
                        </div>
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px', textTransform: 'uppercase' as const }}>Zone</p>
                          <input type="number" min={1} max={7} value={b.zone} onChange={e=>upd(b.id,'zone',parseInt(e.target.value)||3)} style={{ width:'100%', padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, fontFamily:'var(--font-display)', fontWeight:700, outline:'none' }}/>
                        </div>
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px', textTransform: 'uppercase' as const }}>{vLabel}</p>
                          <input value={b.value} onChange={e=>upd(b.id,'value',e.target.value)} placeholder={vPlh} style={{ width:'100%', padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, fontFamily:'var(--font-display)', outline:'none', fontWeight:700 }}/>
                          {sport==='bike' && ftp && parseInt(b.value||'0')>0 && <p style={{ fontSize:9, color:'var(--text-dim)', margin:'2px 0 0' }}>{Math.round(parseInt(b.value||'0')/ftp*100)}% FTP</p>}
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.15)' }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }}>Récupération</p>
                      <div style={{ display: 'grid', gridTemplateColumns: sport==='bike' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px', textTransform: 'uppercase' as const }}>Durée</p>
                          <input value={durMMSS(b.recoveryMin??0)} onChange={e=>upd(b.id,'recoveryMin',mmssToMin(e.target.value))} placeholder="1:00" style={{ width:'100%', padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:13, fontFamily:'var(--font-display)', fontWeight:700, outline:'none' }}/>
                        </div>
                        <div>
                          <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px', textTransform: 'uppercase' as const }}>Zone récup</p>
                          <input type="number" min={1} max={7} value={b.recoveryZone??1} onChange={e=>upd(b.id,'recoveryZone',parseInt(e.target.value)||1)} style={{ width:'100%', padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text)', fontSize:13, fontFamily:'DM Mono,monospace', outline:'none' }}/>
                        </div>
                        {sport==='bike' && (
                          <div>
                            <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 3px', textTransform: 'uppercase' as const }}>Watts récup</p>
                            <input type="number" min={0} step={5} value={b.recoveryValue??''} placeholder="180" onChange={e=>upd(b.id,'recoveryValue',e.target.value)} style={{ width:'100%', padding:'6px 10px', borderRadius:6, border:'1px solid rgba(107,114,128,0.25)', background:'var(--bg-card2)', color:'var(--text-mid)', fontSize:13, fontFamily:'DM Mono,monospace', outline:'none', fontWeight:600 }}/>
                            {ftp && parseInt(b.recoveryValue||'0')>0 && <p style={{ fontSize:9, color:'var(--text-dim)', margin:'2px 0 0' }}>{Math.round(parseInt(b.recoveryValue||'0')/ftp*100)}% FTP · {zc(getZone('bike',b.recoveryValue??''))}</p>}
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize:9, color:'var(--text-dim)', margin:'5px 0 0', fontFamily:'DM Mono,monospace' }}>{recovFmt} en Z{b.recoveryZone??1}{(b.recoveryZone??1)<=1?' — marche/footing très lent':(b.recoveryZone??1)===2?' — footing lent':''}</p>
                    </div>
                  </div>
                  {/* Footer */}
                  <div style={{ padding: '7px 12px', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ flex:1, fontSize:11, color:col, fontWeight:500 }}>{b.reps}×{b.label||`${b.effortMin}min`} · Z{b.zone} {znm(b.zone)}</span>
                    <div style={{ cursor:'grab', display:'flex', flexDirection:'column' as const, gap:2, padding:'2px 4px', flexShrink:0 }}>
                      {[0,1].map(r=><div key={r} style={{ display:'flex', gap:2 }}>{[0,1,2].map(d=><div key={d} style={{ width:3, height:3, borderRadius:'50%', background:'var(--border-mid)' }}/>)}</div>)}
                    </div>
                  </div>
                </div>
              )
            }

            // ── Bloc simple — nouveau design ──
            const col = zc(b.zone)
            const wattsNum = parseInt(b.value ?? '') || 0
            const warnFtp = sport === 'bike' && ftp !== null && wattsNum > ftp && b.durationMin > 60
            const inFtpPct = ftpPctMode[b.id] ?? false
            const isHov = hoveredBlockId === b.id
            return (
              <div key={b.id} {...dragProps}
                onMouseEnter={() => setHoveredBlockId(b.id)} onMouseLeave={() => setHoveredBlockId(null)}
                style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', opacity: isDragging ? 0.5 : 1, outline: isDragOver ? '2px solid var(--primary)' : 'none', borderColor: isHov ? 'var(--border-mid)' : 'var(--border)', transition: 'border-color 0.12s' }}>
                {/* Header */}
                <div style={{ background: 'var(--bg-card2)', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, background: `${col}1A`, color: col, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Z{b.zone}</span>
                  <select value={b.type} onChange={e => changeType(b.id, e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}>
                    {(Object.entries(BLOCK_TYPE_LABEL) as [BlockType,string][]).filter(([k]) => k !== 'circuit_header').map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{b.label || 'Bloc'}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--text)', flexShrink:0 }}>{formatHM(b.durationMin)}</span>
                  <button onClick={() => duplicate(bi)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:12, padding:'0 3px', flexShrink:0 }} title="Dupliquer">📋</button>
                  <button onClick={() => onChange(blocks.filter(x => x.id !== b.id))}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#EF4444'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='var(--text-dim)'}}
                    style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:18, lineHeight:1, padding:'0 2px', flexShrink:0, transition:'color 0.12s' }}>×</button>
                </div>
                {/* Body */}
                <div style={{ padding: '10px 12px', background: 'var(--bg-card)' }}>
                  <input value={b.label} onChange={e=>upd(b.id,'label',e.target.value)} placeholder="Nom du bloc (ex: Tempo)" style={{ width:'100%', padding:'8px 11px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card2)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' as const, marginBottom:10 }}/>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, alignItems: 'end' }}>
                    <StepperField label="Durée" value={durMMSS(b.durationMin)}
                      onChange={v=>upd(b.id,'durationMin',mmssToMin(v))}
                      onDec={()=>upd(b.id,'durationMin',bumpDurSec(b.durationMin,-1))}
                      onInc={()=>upd(b.id,'durationMin',bumpDurSec(b.durationMin,1))} />
                    {inFtpPct && sport === 'bike' && ftp ? (
                      <div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, minHeight:14 }}>
                          <p style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', margin:0 }}>{vLabel}</p>
                          <button onClick={() => setFtpPctMode(p=>({...p,[b.id]:!p[b.id]}))} style={{ fontSize:8, padding:'1px 5px', borderRadius:3, border:`1px solid ${col}`, background:`${col}15`, color:col, cursor:'pointer', fontWeight:600 }}>→W</button>
                        </div>
                        <div style={{ position:'relative' as const, display:'flex', alignItems:'center', height:34 }}>
                          <input type="number" min={1} max={200} placeholder="75" value={wattsNum>0?Math.round(wattsNum/ftp*100):''} onChange={e=>{const p=parseFloat(e.target.value)||0;upd(b.id,'value',String(Math.round(ftp*p/100)))}} style={{ width:'100%', padding:'0 20px 0 10px', borderRadius:8, border:`1px solid ${col}50`, background:'var(--bg-card2)', color:col, fontSize:15, fontFamily:'var(--font-display)', outline:'none', fontWeight:700, boxSizing:'border-box' as const }}/>
                          <span style={{ position:'absolute' as const, right:6, fontSize:9, color:'var(--text-dim)', pointerEvents:'none' as const }}>%</span>
                        </div>
                      </div>
                    ) : (
                      <StepperField label={vLabel} value={b.value||''} placeholder={vPlh} color="var(--text)"
                        onChange={v=>upd(b.id,'value',v)}
                        onDec={()=>upd(b.id,'value',bumpPaceOrWatts(b.value||'',-1))}
                        onInc={()=>upd(b.id,'value',bumpPaceOrWatts(b.value||'',1))}
                        headerRight={sport === 'bike' && ftp ? (
                          <button onClick={() => setFtpPctMode(p=>({...p,[b.id]:!p[b.id]}))} style={{ fontSize:8, padding:'1px 5px', borderRadius:3, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', cursor:'pointer', fontWeight:600 }}>%FTP</button>
                        ) : undefined} />
                    )}
                    <StepperField label="FC" unit="bpm" value={b.hrAvg||''} color="var(--text)"
                      onChange={v=>upd(b.id,'hrAvg',v)}
                      onDec={()=>upd(b.id,'hrAvg',String(Math.max(0,(parseInt(b.hrAvg||'0')||0)-1)))}
                      onInc={()=>upd(b.id,'hrAvg',String((parseInt(b.hrAvg||'0')||0)+1))} />
                  </div>
                  {sport==='bike' && ftp && wattsNum>0 && !inFtpPct && <p style={{ fontSize:9, color:'var(--text-dim)', margin:'6px 0 0' }}>{Math.round(wattsNum/ftp*100)}% FTP</p>}
                  {/* FTP warning */}
                  {warnFtp && (
                    <div style={{ marginTop:8, padding:'5px 10px', borderRadius:6, background:'rgba(234,88,12,0.08)', border:'1px solid rgba(234,88,12,0.25)', display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:11 }}>⚠</span>
                      <span style={{ fontSize:10, color:'#EA580C', fontWeight:600 }}>{wattsNum}W &gt; FTP ({ftp}W) sur {b.durationMin}min — intensité non soutenable</span>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div style={{ padding:'7px 12px', background:'var(--bg-card2)', display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ flex:1, fontSize:11, color:col, fontWeight:500 }}>
                    {sport==='bike'&&b.value?`${b.value}W · `:b.value?`${b.value} · `:''}Z{b.zone} {znm(b.zone)}
                  </span>
                  <div style={{ cursor:'grab', display:'flex', flexDirection:'column' as const, gap:2, padding:'2px 4px', flexShrink:0 }}>
                    {[0,1].map(r=><div key={r} style={{ display:'flex', gap:2 }}>{[0,1,2].map(d=><div key={d} style={{ width:3, height:3, borderRadius:'50%', background:'var(--border-mid)' }}/>)}</div>)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ══ BOUTONS AJOUTER ══ */}
      {sport === 'gym' || sport === 'hyrox' ? (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
          <button onClick={() => onChange([...blocks,{id:`b_${Date.now()}`,mode:'single',type:'effort',durationMin:0,zone:3,value:'',hrAvg:'',label:'Exercice',reps:10,recoveryMin:1.5}])} style={{ width:'100%', padding:'10px', borderRadius:10, background:'transparent', border:'1px dashed var(--border-mid)', color:'var(--text-dim)', fontSize:12, cursor:'pointer' }}>+ Exercice</button>
          {!showCircuitMenu ? (
            <button onClick={() => setShowCircuitMenu(true)} style={{ width:'100%', padding:'10px', borderRadius:10, background:'transparent', border:`1px dashed ${SPORT_BORDER[sport]}66`, color:SPORT_BORDER[sport], fontSize:12, cursor:'pointer' }}>+ Ajouter un circuit</button>
          ) : (
            <div style={{ padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-card2)' }}>
              <p style={{ fontSize:10, fontWeight:600, color:'var(--text-dim)', margin:'0 0 8px' }}>Quel type de circuit ?</p>
              <div style={{ display:'flex', flexDirection:'column' as const, gap:4 }}>
                {CIRCUIT_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => {
                    const nExos = blocks.filter(x=>x.type==='circuit_header').length
                    onChange([...blocks,{id:`circuit_${Date.now()}`,mode:ct.id,type:'circuit_header',label:`${ct.label} ${nExos+1}`,zone:ct.id==='tabata'?8:3,durationMin:ct.id==='emom'?12:0,recoveryMin:ct.id==='tabata'||ct.id==='emom'?0:1.5,reps:0,value:'',hrAvg:''}])
                    setShowCircuitMenu(false)
                  }} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', textAlign:'left' as const, width:'100%' }}>
                    <span style={{ fontSize:14, width:20, textAlign:'center' as const, flexShrink:0 }}>{ct.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{ct.label}</span>
                      <span style={{ fontSize:10, color:'var(--text-dim)', marginLeft:8 }}>{ct.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={()=>setShowCircuitMenu(false)} style={{ marginTop:8, width:'100%', padding:'7px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-dim)', fontSize:10, cursor:'pointer' }}>Annuler</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={addSingle}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--primary)'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}}
            style={{ flex:1, padding:'12px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', gap:11, textAlign:'left' as const, transition:'border-color .15s' }}>
            <span style={{ width:30, height:30, borderRadius:9, background:'var(--bg-elev)', color:'var(--text-mid)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:300, flexShrink:0, lineHeight:1 }}>+</span>
            <span style={{ display:'flex', flexDirection:'column' as const, gap:1 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Bloc simple</span>
              <span style={{ fontSize:10.5, color:'var(--text-dim)' }}>Effort continu</span>
            </span>
          </button>
          <button onClick={addInterval}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--primary)'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}}
            style={{ flex:1, padding:'12px 14px', borderRadius:12, background:'var(--bg-card2)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', gap:11, textAlign:'left' as const, transition:'border-color .15s' }}>
            <span style={{ width:30, height:30, borderRadius:9, background:'var(--bg-elev)', color:'var(--text-mid)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0, lineHeight:1 }}>⟳</span>
            <span style={{ display:'flex', flexDirection:'column' as const, gap:1 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Répétitions</span>
              <span style={{ fontSize:10.5, color:'var(--text-dim)' }}>Intervalles</span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}


// ── Add Session Modal ─────────────────────────────

function getTrainingTypeDescription(sport: SportType, type: string): string {
  const desc: Partial<Record<SportType, Record<string, string>>> = {
    run: {
      'EF':           'Endurance fondamentale — Zone 1-2, conversation possible, socle aérobie.',
      'SL1':          'Seuil 1 — Tempo confortable, Zone 3, lactate stable.',
      'SL2':          'Seuil 2 — Effort dur soutenu, Zone 4, lactate au seuil.',
      'VMA':          'Vitesse Maximale Aérobie — Intervalles courts à haute intensité, Zone 5.',
      'Strides':      'Accélérations progressives 20-30s, récup marche. Travail neuromusculaire.',
      'Heat Training':'Entraînement à la chaleur pour adaptation thermique et physiologique.',
    },
    bike: {
      'EF':           'Endurance fondamentale — Zone 1-2, socle aérobie, récupération active.',
      'SL1':          'Sweet Spot — 88-93% FTP, Zone 3-4, développement du seuil.',
      'SL2':          'Seuil — 95-105% FTP, Zone 4, haute puissance soutenue.',
      'PMA':          'Puissance Maximale Aérobie — Intervalles 3-8min à 110-130% FTP.',
      'Sprints':      'Sprints neuromusculaires — 10-30s à 150%+ FTP, récup complète.',
      'Heat Training':'Entraînement à la chaleur pour adaptation thermique.',
    },
    swim: {
      'EF':        'Endurance fondamentale — volumes longs, technique prioritaire.',
      'Technique': 'Drills technique — travail gestuel spécifique, coordination.',
      'Seuil':     'Effort au seuil — 400m-1km répétés à allure compétition.',
      'Sprints':   'Sprints courts — 25-50m à 100% d\'effort, récupération longue.',
    },
    hyrox: {
      'Simulation':   'Simulation course complète — enchaînement stations + runs 1km.',
      'Ergo':         'SkiErg ou Rowing seul — intervalles ou volume.',
      'Wall Ball':    'Travail spécifique Wall Ball — volume ou technique.',
      'BBJ':          'Burpee Broad Jump — technique et volume.',
      'Fentes':       'Fentes Sandbag — endurance musculaire spécifique.',
      'Sled Push':    'Sled Push — charge et vitesse de déplacement.',
      'Sled Pull':    'Sled Pull — force et endurance spécifique.',
      'Farmer Carry': 'Farmer Carry — grip, stabilité et endurance musculaire.',
    },
    gym: {
      'Strength':           'Force pure — charges lourdes, 3-5 reps, repos 3-5min.',
      'Strength endurance': 'Force-endurance — charges modérées, 8-15 reps, haute densité.',
      'Explosivité':        'Plyométrie — sauts, puissance neuromusculaire.',
    },
    rowing: {
      'EF':      'Endurance fondamentale — Zone 2, technique, volume.',
      'SL1':     'Seuil 1 — Tempo aérobie, Zone 3, lactate stable.',
      'SL2':     'Seuil 2 — Haute intensité soutenue, Zone 4.',
      'PMA':     'VO2max — Intervalles 2-4min à pleine puissance.',
      'Sprints': 'Sprints neuromusculaires, 15-30s, récup complète.',
    },
  }
  return desc[sport]?.[type] ?? type
}

function computeZoneDistribution(blocks: Block[], zoneCount: number): number[] {
  const dist = new Array(zoneCount).fill(0)
  for (const b of blocks) {
    const effMin = b.mode === 'interval' && b.reps && b.effortMin
      ? b.reps * b.effortMin : b.durationMin
    const recMin = b.mode === 'interval' && b.reps && b.recoveryMin
      ? b.reps * b.recoveryMin : 0
    const effZone = Math.max(0, Math.min(zoneCount - 1, b.zone - 1))
    const recZone = Math.max(0, Math.min(zoneCount - 1, (b.recoveryZone ?? 1) - 1))
    dist[effZone] += effMin
    if (recMin > 0) dist[recZone] += recMin
  }
  const total = dist.reduce((a, b) => a + b, 0)
  if (total === 0) return dist
  return dist.map(v => Math.round((v / total) * 100))
}

function computeHRDistribution(blocks: Block[], fcZones?: number[]): { label: string; pct: number; color: string }[] {
  const buckets = fcZones && fcZones.length >= 4
    ? [
        { label: `<${fcZones[0]}`, color: '#6b7280', min: 0, max: fcZones[0] },
        { label: `${fcZones[0]}-${fcZones[1]}`, color: '#4ade80', min: fcZones[0], max: fcZones[1] },
        { label: `${fcZones[1]}-${fcZones[2]}`, color: '#facc15', min: fcZones[1], max: fcZones[2] },
        { label: `${fcZones[2]}-${fcZones[3]}`, color: '#fb923c', min: fcZones[2], max: fcZones[3] },
        { label: `${fcZones[3]}+`, color: '#f87171', min: fcZones[3], max: 999 },
      ]
    : [
        { label: '<120', color: '#6b7280', min: 0, max: 120 },
        { label: '120-140', color: '#4ade80', min: 120, max: 140 },
        { label: '140-155', color: '#facc15', min: 140, max: 155 },
        { label: '155-170', color: '#fb923c', min: 155, max: 170 },
        { label: '170+', color: '#f87171', min: 170, max: 999 },
      ]
  const mins = new Array(buckets.length).fill(0)
  let hasData = false
  for (const b of blocks) {
    const hr = parseInt(b.hrAvg)
    if (!hr || hr <= 0) continue
    hasData = true
    const effMin = b.mode === 'interval' && b.reps && b.effortMin ? b.reps * b.effortMin : b.durationMin
    const idx = buckets.findIndex(bk => hr >= bk.min && hr < bk.max)
    if (idx >= 0) mins[idx] += effMin
  }
  if (!hasData) return []
  const total = mins.reduce((a, b) => a + b, 0)
  if (total === 0) return []
  return buckets.map((bk, i) => ({ label: bk.label, pct: Math.round((mins[i] / total) * 100), color: bk.color })).filter(e => e.pct > 0)
}

export interface NutritionItem {
  id: string
  timeMin: number
  type: 'gel' | 'barre' | 'boisson' | 'solide' | 'autre'
  name: string
  quantity: string
  glucidesG: number
  proteinesG: number
  notes: string
}

const NUTRITION_TYPES: { id: NutritionItem['type']; label: string; defaultQty: string; defaultGlu: number }[] = [
  { id: 'gel', label: 'Gel', defaultQty: '1 gel', defaultGlu: 25 },
  { id: 'barre', label: 'Barre', defaultQty: '1 barre', defaultGlu: 30 },
  { id: 'boisson', label: 'Boisson', defaultQty: '500ml', defaultGlu: 30 },
  { id: 'solide', label: 'Solide', defaultQty: '1 portion', defaultGlu: 20 },
  { id: 'autre', label: 'Autre', defaultQty: '', defaultGlu: 0 },
]

// ── Parcours helpers ──────────────────────────────
export interface ParcoursPlanningConfig {
  climbConfigs: Array<{ segIdx: number; selected: boolean; watts: number; hrAvg?: number; estimatedMin: number }>
  specificBlocks: Array<{ id: string; startKm: number; endKm: number; watts: number; hrAvg?: number; estimatedMin: number }>
  efWatts: number
  efHr?: number
  totalDuration: string
}

export interface ParcoursData {
  name: string
  distance: number | null
  elevation: number | null
  points: number
  elevationProfile: Array<{ distKm: number; ele: number }>
  gpsTrace?: Array<{ lat: number; lon: number }>
  avgSpeed?: number | null
  /** Segments détectés côté client — calculés par segmentElevationProfile() */
  segments?: ParsedSegment[]
  /** UUID Supabase après sauvegarde dans la table parcours */
  parcoursId?: string
  /** Config de planification (watts côtes, blocs spécifiques, EF, durée) */
  planningConfig?: ParcoursPlanningConfig
}

function buildGpsTrace(pts: Array<{ lat: number; lon: number; ele: number }>): Array<{ lat: number; lon: number }> {
  const trace: Array<{ lat: number; lon: number }> = []
  for (const pt of pts) {
    if (trace.length === 0) {
      trace.push({ lat: pt.lat, lon: pt.lon })
    } else {
      const prev = trace[trace.length - 1]
      const R = 6371000
      const dLat = (pt.lat - prev.lat) * Math.PI / 180
      const dLon = (pt.lon - prev.lon) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(pt.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      if (d >= 100) trace.push({ lat: pt.lat, lon: pt.lon })
    }
  }
  // Always include last point
  if (pts.length > 0) {
    const last = pts[pts.length - 1]
    const t = trace[trace.length - 1]
    if (!t || t.lat !== last.lat || t.lon !== last.lon) trace.push({ lat: last.lat, lon: last.lon })
  }
  return trace
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function buildElevationProfile(
  pts: Array<{ lat: number; lon: number; ele: number }>,
): { distKm: number; elevM: number; profile: Array<{ distKm: number; ele: number }> } {
  const profile: Array<{ distKm: number; ele: number }> = []
  let cumDist = 0
  let elevM = 0

  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      const d = haversineM(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon)
      cumDist += d
      const diff = pts[i].ele - pts[i - 1].ele
      if (diff > 0) elevM += diff
    }
    const distKm = Math.round(cumDist / 100) / 10
    const lastKm = profile.length > 0 ? profile[profile.length - 1].distKm : -1
    if (distKm - lastKm >= 0.2 || i === 0) {
      profile.push({ distKm, ele: Math.round(pts[i].ele) })
    }
  }
  // Ensure last point is included
  if (pts.length > 0) {
    const finalKm = Math.round(cumDist / 100) / 10
    const lastKm = profile.length > 0 ? profile[profile.length - 1].distKm : 0
    if (finalKm > lastKm) {
      profile.push({ distKm: finalKm, ele: Math.round(pts[pts.length - 1].ele) })
    }
  }
  return { distKm: Math.round(cumDist / 100) / 10, elevM: Math.round(elevM), profile }
}

function parseRouteFile(file: File): Promise<ParcoursData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parser = new DOMParser()
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        let pts: Array<{ lat: number; lon: number; ele: number }> = []
        let name = file.name.replace(/\.[^.]+$/, '')

        if (ext === 'gpx') {
          const doc = parser.parseFromString(text, 'application/xml')
          const nameEl = doc.querySelector('name')
          if (nameEl?.textContent) name = nameEl.textContent.trim()
          const trkpts = Array.from(doc.querySelectorAll('trkpt'))
          const src = trkpts.length > 0 ? trkpts : Array.from(doc.querySelectorAll('wpt, rtept'))
          pts = src.map(pt => ({
            lat: parseFloat(pt.getAttribute('lat') ?? '0'),
            lon: parseFloat(pt.getAttribute('lon') ?? '0'),
            ele: parseFloat(pt.querySelector('ele')?.textContent ?? '0'),
          }))
        } else if (ext === 'tcx') {
          const doc = parser.parseFromString(text, 'application/xml')
          const actName = doc.querySelector('Id')
          if (actName?.textContent) name = actName.textContent.trim()
          pts = Array.from(doc.querySelectorAll('Trackpoint')).map(tp => ({
            lat: parseFloat(tp.querySelector('LatitudeDegrees')?.textContent ?? '0'),
            lon: parseFloat(tp.querySelector('LongitudeDegrees')?.textContent ?? '0'),
            ele: parseFloat(tp.querySelector('AltitudeMeters')?.textContent ?? '0'),
          })).filter(p => p.lat !== 0 || p.lon !== 0)
        } else if (ext === 'kml') {
          const doc = parser.parseFromString(text, 'application/xml')
          const nameEl = doc.querySelector('name')
          if (nameEl?.textContent) name = nameEl.textContent.trim()
          const coords = doc.querySelector('coordinates')?.textContent?.trim() ?? ''
          pts = coords.split(/\s+/).filter(Boolean).map(c => {
            const [lon, lat, ele] = c.split(',').map(Number)
            return { lat: lat ?? 0, lon: lon ?? 0, ele: ele ?? 0 }
          })
        } else {
          reject(new Error('Format non supporté')); return
        }

        if (pts.length === 0) { reject(new Error('Aucun point GPS trouvé')); return }

        const { distKm, elevM, profile } = buildElevationProfile(pts)
        const gpsTrace = buildGpsTrace(pts)
        // Segmentation côté client (lissage 100m + gradient + filtrage)
        const segments = segmentElevationProfile(profile)
        resolve({
          name,
          distance: distKm > 0 ? distKm : null,
          elevation: elevM > 0 ? elevM : null,
          points: pts.length,
          elevationProfile: profile,
          gpsTrace,
          avgSpeed: null,
          segments,
        })
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(new Error('Lecture fichier échouée'))
    reader.readAsText(file)
  })
}

// ── Terrain analysis ──────────────────────────────
interface TerrainSegment {
  startKm: number
  endKm: number
  startEle: number
  endEle: number
  distanceKm: number
  avgGradient: number
  type: 'climb' | 'descent' | 'flat'
  estimatedMinutes: number
}

function estimateTimeOnSegment(distKm: number, gradientPct: number, watts: number, riderKg: number, bikeKg: number): number {
  const totalMass = riderKg + bikeKg
  const gradient  = gradientPct / 100
  const Crr       = 0.004
  const g         = 9.81
  const rho       = 1.225  // air density kg/m³
  const CdA       = 0.36   // road cyclist in hoods (m²)

  // Solve P = [m·g·(grad+Crr) + ½·ρ·CdA·v²]·v  for v (Newton-Raphson)
  // f(v) = m·g·(grad+Crr)·v + ½·ρ·CdA·v³ − P = 0
  const Fm = totalMass * g * (gradient + Crr)
  let v = 5  // initial guess ~18 km/h

  for (let iter = 0; iter < 50; iter++) {
    const fv  = Fm * v + 0.5 * rho * CdA * v * v * v - watts
    const dfv = Fm + 1.5 * rho * CdA * v * v
    if (Math.abs(dfv) < 1e-10) break
    const delta = fv / dfv
    v = Math.max(0.28, v - delta)
    if (Math.abs(delta) < 0.001) break
  }

  // Clamp to physically plausible range: ~1 km/h to 80 km/h
  v = Math.max(0.28, Math.min(22, v))
  return (distKm * 1000 / v) / 60
}

function analyzeTerrainSegments(
  profile: Array<{ distKm: number; ele: number }>,
  ftp: number,
  riderWeight: number,
  bikeWeight: number,
): TerrainSegment[] {
  if (profile.length < 2) return []
  type TType = 'climb' | 'descent' | 'flat'
  function getType(g: number): TType { return g > 2 ? 'climb' : g < -2 ? 'descent' : 'flat' }

  const gradients: Array<{ distKm: number; gradient: number }> = []
  for (let i = 1; i < profile.length; i++) {
    const dDist = (profile[i].distKm - profile[i - 1].distKm) * 1000
    if (dDist <= 0) continue
    gradients.push({ distKm: profile[i].distKm, gradient: ((profile[i].ele - profile[i - 1].ele) / dDist) * 100 })
  }
  if (gradients.length === 0) return []

  const segments: TerrainSegment[] = []
  let currentType = getType(gradients[0].gradient)
  let segStartIdx = 0
  const watts = ftp * 0.85

  const pushSeg = (fromIdx: number, toIdx: number, type: TType) => {
    const startKm = fromIdx === 0 ? profile[0].distKm : gradients[fromIdx].distKm
    const endKm   = gradients[Math.min(toIdx, gradients.length - 1)].distKm
    if (endKm - startKm < 0.3) return
    const startEle = profile.find(p => p.distKm >= startKm)?.ele ?? 0
    const endEle   = profile.find(p => p.distKm >= endKm)?.ele   ?? startEle
    const distKm   = endKm - startKm
    const avgGrad  = distKm > 0 ? ((endEle - startEle) / (distKm * 1000)) * 100 : 0
    segments.push({
      startKm:         Math.round(startKm * 10) / 10,
      endKm:           Math.round(endKm   * 10) / 10,
      startEle:        Math.round(startEle),
      endEle:          Math.round(endEle),
      distanceKm:      Math.round(distKm  * 10) / 10,
      avgGradient:     Math.round(avgGrad * 10) / 10,
      type,
      estimatedMinutes: Math.round(estimateTimeOnSegment(distKm, avgGrad, watts, riderWeight, bikeWeight) * 10) / 10,
    })
  }

  for (let i = 1; i < gradients.length; i++) {
    const thisType = getType(gradients[i].gradient)
    if (thisType !== currentType) {
      pushSeg(segStartIdx, i - 1, currentType)
      currentType = thisType
      segStartIdx = i
    }
  }
  pushSeg(segStartIdx, gradients.length - 1, currentType)

  // ── Gap tolerance: fusionner descente/plat < 500m entre deux montées ──
  let cur = [...segments]
  let changed = true
  while (changed) {
    changed = false
    const next: TerrainSegment[] = []
    for (let i = 0; i < cur.length; i++) {
      const prev = next[next.length - 1]
      const curr = cur[i]
      const nxt  = cur[i + 1]
      if (
        prev?.type === 'climb' &&
        nxt?.type  === 'climb' &&
        curr.type  !== 'climb' &&
        curr.distanceKm < 0.5
      ) {
        const distKm   = nxt.endKm - prev.startKm
        const dEle     = nxt.endEle - prev.startEle
        const avgGrad  = distKm > 0 ? (dEle / (distKm * 1000)) * 100 : 0
        next[next.length - 1] = {
          ...prev,
          endKm:            nxt.endKm,
          endEle:           nxt.endEle,
          distanceKm:       Math.round(distKm * 10) / 10,
          avgGradient:      Math.round(avgGrad * 10) / 10,
          estimatedMinutes: Math.round(estimateTimeOnSegment(distKm, avgGrad, watts, riderWeight, bikeWeight) * 10) / 10,
        }
        i++ // consommer nxt
        changed = true
      } else {
        next.push({ ...curr })
      }
    }
    cur = next
  }
  return cur
}

// ── LocalInput — saisie libre sans clamp pendant la frappe ───
function LocalInput({ value, onCommit, min, max, style, placeholder, step }: {
  value: number | undefined | null
  onCommit: (v: number) => void
  min?: number
  max?: number
  style?: React.CSSProperties
  placeholder?: string
  step?: number
}) {
  const ext = value != null ? String(value) : ''
  const [local, setLocal] = useState(ext)
  const [prev, setPrev] = useState(ext)
  if (ext !== prev) { setPrev(ext); setLocal(ext) }
  return (
    <input
      type="text"
      inputMode="numeric"
      value={local}
      placeholder={placeholder}
      step={step}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const n = parseFloat(local.replace(',', '.'))
        if (!isNaN(n)) {
          const c = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n))
          onCommit(c)
          setLocal(String(c))
        } else {
          setLocal(ext)
        }
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      style={style}
    />
  )
}

// ── IntervalPanel ────────────────────────────────────────────────────
function IntervalPanel({
  blockDurationMin, defaultWatts, ftp,
  value, onChange, onClose,
}: {
  blockDurationMin: number; defaultWatts: number; ftp: number
  value: { blocks: { type: 'effort' | 'recovery'; sec: number; watts: number }[]; reps: number } | null
  onChange: (v: { blocks: { type: 'effort' | 'recovery'; sec: number; watts: number }[]; reps: number } | null) => void
  onClose: () => void
}) {
  const initBlocks = value?.blocks ?? [
    { type: 'effort' as const, sec: 30, watts: defaultWatts },
    { type: 'recovery' as const, sec: 15, watts: Math.round(ftp * 0.50) },
  ]
  const [iBlocks, setIBlocks] = useState<{ type: 'effort' | 'recovery'; sec: number; watts: number }[]>(initBlocks)
  const [reps, setReps]       = useState(value?.reps ?? 8)

  function wattsZone(w: number): string {
    const r = w / ftp
    return r > 1.50 ? 'Z7' : r > 1.20 ? 'Z6' : r > 1.05 ? 'Z5' : r > 0.87 ? 'Z4' : r > 0.75 ? 'Z3' : r > 0.55 ? 'Z2' : 'Z1'
  }
  function wattsColor(w: number): string {
    const r = w / ftp
    return r > 1.50 ? '#1D4ED8' : r > 1.20 ? '#8B5CF6' : r > 1.05 ? '#EF4444' : r > 0.87 ? '#F97316' : r > 0.75 ? '#FBBF24' : r > 0.55 ? '#10B981' : '#9CA3AF'
  }
  function toMmSs(s: number): string { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` }
  function parseMmSs(str: string): number { const p=str.split(':'); return (parseInt(p[0])||0)*60+(parseInt(p[1])||0) }
  function fmtSec(s: number): string { const m=Math.floor(s/60),sc=s%60; return m>0?`${m}′${sc>0?String(sc).padStart(2,'0')+'″':''}`:`${sc}″` }

  const perRepSec = iBlocks.reduce((a, b) => a + b.sec, 0)
  const totSec    = perRepSec * reps
  const totMin    = totSec / 60
  const blockSec  = blockDurationMin * 60
  const overflow  = totSec > blockSec + 30
  const remainSec = blockSec - totSec

  type Preset = { l: string; blocks: { type: 'effort' | 'recovery'; sec: number; watts: number }[] }
  const efW = iBlocks.find(b => b.type === 'effort')?.watts ?? defaultWatts
  const rcW = iBlocks.find(b => b.type === 'recovery')?.watts ?? Math.round(ftp * 0.50)
  const PRESETS: Preset[] = [
    { l:'30/15', blocks:[{type:'effort',sec:30,watts:efW},{type:'recovery',sec:15,watts:rcW}] },
    { l:'30/30', blocks:[{type:'effort',sec:30,watts:efW},{type:'recovery',sec:30,watts:rcW}] },
    { l:'45/45', blocks:[{type:'effort',sec:45,watts:efW},{type:'recovery',sec:45,watts:rcW}] },
    { l:'1′/1′', blocks:[{type:'effort',sec:60,watts:efW},{type:'recovery',sec:60,watts:rcW}] },
    { l:'1′30/30', blocks:[{type:'effort',sec:90,watts:efW},{type:'recovery',sec:30,watts:rcW}] },
    { l:'2′/1′', blocks:[{type:'effort',sec:120,watts:efW},{type:'recovery',sec:60,watts:rcW}] },
    { l:'4′/1′', blocks:[{type:'effort',sec:240,watts:efW},{type:'recovery',sec:60,watts:rcW}] },
  ]

  function addBlock(type: 'effort' | 'recovery') {
    setIBlocks(prev => [...prev, { type, sec: type === 'effort' ? 30 : 15, watts: type === 'effort' ? defaultWatts : Math.round(ftp * 0.50) }])
  }
  function removeBlock(idx: number) {
    setIBlocks(prev => prev.filter((_, i) => i !== idx))
  }
  function updateBlock(idx: number, field: 'type' | 'sec' | 'watts', val: string | number) {
    setIBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [field]: val } : b))
  }

  return (
    <div style={{ padding:'12px 14px', background:'var(--bg-card2)', borderTop:'1px solid var(--border)' }}>
      {/* Presets */}
      <div style={{ marginBottom:10 }}>
        <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.06em', color:'var(--text-dim)', margin:'0 0 6px' }}>Presets</p>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' as const }}>
          {PRESETS.map(p => {
            const active = p.blocks.length === iBlocks.length && p.blocks.every((pb, i) => pb.type === iBlocks[i]?.type && pb.sec === iBlocks[i]?.sec)
            const pCol = wattsColor(p.blocks.find(b=>b.type==='effort')?.watts ?? defaultWatts)
            return (
              <button key={p.l} onClick={() => { setIBlocks(p.blocks); setReps(Math.max(1, perRepSec > 0 ? Math.floor(blockSec / p.blocks.reduce((a,b) => a+b.sec,0)) : 8)) }}
                style={{ padding:'3px 8px', borderRadius:5, border:'1px solid var(--border)', fontSize:9, fontWeight:600, cursor:'pointer', fontFamily:'DM Mono,monospace',
                  background: active ? `${pCol}22` : 'var(--bg-card)', color: active ? pCol : 'var(--text-mid)' }}>{p.l}</button>
            )
          })}
          <button onClick={() => onChange(null)} style={{ padding:'3px 8px', borderRadius:5, border:'1px solid rgba(239,68,68,0.35)', background:'rgba(239,68,68,0.07)', color:'#ef4444', fontSize:9, fontWeight:600, cursor:'pointer', marginLeft:'auto' }}>✕ Supprimer</button>
        </div>
      </div>
      {/* Blocks list */}
      <div style={{ display:'flex', flexDirection:'column' as const, gap:5, marginBottom:8 }}>
        {iBlocks.map((ib, idx) => {
          const col = wattsColor(ib.watts)
          const isEf = ib.type === 'effort'
          return (
            <div key={idx} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 9px', borderRadius:7,
              border:`1px solid ${col}40`, background:`${col}07` }}>
              {/* Type toggle */}
              <button onClick={() => updateBlock(idx, 'type', isEf ? 'recovery' : 'effort')}
                style={{ padding:'2px 7px', borderRadius:4, border:`1px solid ${col}60`, background:`${col}20`, color:col, fontSize:8, fontWeight:700, cursor:'pointer', minWidth:46, flexShrink:0 }}>
                {isEf ? 'EFFORT' : 'RÉCUP'}
              </button>
              {/* Duration */}
              <input type="text" defaultValue={toMmSs(ib.sec)} key={`sec_${idx}_${ib.sec}`}
                onBlur={e => updateBlock(idx, 'sec', Math.max(5, parseMmSs(e.target.value)))}
                style={{ width:44, padding:'2px 4px', borderRadius:4, border:`1px solid ${col}40`, background:'var(--bg-card)', color:'var(--text)', fontSize:10, fontFamily:'DM Mono,monospace', textAlign:'center' as const, outline:'none' }}/>
              <span style={{ fontSize:8, color:'var(--text-dim)', flexShrink:0 }}>mm:ss</span>
              {/* Watts */}
              <input type="number" value={ib.watts} onChange={e => updateBlock(idx, 'watts', Math.max(50, Math.min(600, parseInt(e.target.value)||0)))}
                style={{ width:44, padding:'2px 4px', borderRadius:4, border:`1px solid ${col}40`, background:'var(--bg-card)', color:col, fontSize:10, fontWeight:700, fontFamily:'DM Mono,monospace', textAlign:'center' as const, outline:'none' }}/>
              <span style={{ fontSize:8, color:'var(--text-dim)', flexShrink:0 }}>W</span>
              <span style={{ fontSize:9, fontWeight:700, color:col, flexShrink:0 }}>{wattsZone(ib.watts)}</span>
              <div style={{ flex:1 }}/>
              {iBlocks.length > 1 && (
                <button onClick={() => removeBlock(idx)}
                  style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:13, padding:'0 2px', lineHeight:1, flexShrink:0 }}>×</button>
              )}
            </div>
          )
        })}
      </div>
      {/* Add block buttons */}
      <div style={{ display:'flex', gap:5, marginBottom:8 }}>
        <button onClick={() => addBlock('effort')}
          style={{ padding:'3px 9px', borderRadius:5, border:'1px solid rgba(239,68,68,0.35)', background:'rgba(239,68,68,0.07)', color:'#EF4444', fontSize:9, fontWeight:600, cursor:'pointer' }}>+ Effort</button>
        <button onClick={() => addBlock('recovery')}
          style={{ padding:'3px 9px', borderRadius:5, border:'1px solid rgba(16,185,129,0.35)', background:'rgba(16,185,129,0.07)', color:'#10B981', fontSize:9, fontWeight:600, cursor:'pointer' }}>+ Récup</button>
      </div>
      {/* Reps row */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ fontSize:9, color:'var(--text-dim)', whiteSpace:'nowrap' as const }}>Répétitions</span>
        <input type="number" value={reps} min={1} max={99} onChange={e => setReps(Math.max(1,parseInt(e.target.value)||1))}
          style={{ width:40, padding:'2px 5px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text)', fontSize:11, fontWeight:700, fontFamily:'DM Mono,monospace', textAlign:'center' as const, outline:'none' }}/>
        <button onClick={() => { if(perRepSec>0) setReps(Math.max(1,Math.floor(blockSec/perRepSec))) }}
          style={{ padding:'2px 8px', borderRadius:4, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-mid)', fontSize:9, fontWeight:600, cursor:'pointer' }}>Auto</button>
        <span style={{ fontSize:10, color:'var(--text)', fontFamily:'DM Mono,monospace' }}>
          = {Math.floor(totMin)}:{String(Math.round((totMin%1)*60)).padStart(2,'0')}
        </span>
        {overflow && <span style={{ fontSize:9, color:'#ef4444', background:'rgba(239,68,68,0.1)', borderRadius:3, padding:'1px 5px' }}>⚠ +{Math.round((totSec-blockSec)/60)}min</span>}
        {!overflow && remainSec > 30 && <span style={{ fontSize:9, color:'#eab308', background:'rgba(234,179,8,0.1)', borderRadius:3, padding:'1px 5px' }}>⚠ {Math.round(remainSec/60)}min non couverts</span>}
      </div>
      {/* Summary formula */}
      <div style={{ padding:'6px 9px', borderRadius:5, background:'var(--bg-card)', border:'1px solid var(--border)', fontSize:9, fontFamily:'DM Mono,monospace', color:'var(--text-mid)', marginBottom:8 }}>
        {reps} × ({iBlocks.map(b => `${fmtSec(b.sec)} @${b.watts}W`).join(' + ')})
        {' '}= <strong style={{ color:overflow?'#ef4444':'var(--text)' }}>{Math.floor(totMin)}:{String(Math.round((totMin%1)*60)).padStart(2,'0')}</strong>
      </div>
      {/* Mini viz */}
      <div style={{ display:'flex', height:20, borderRadius:4, overflow:'hidden', marginBottom:8 }}>
        {Array.from({length:Math.min(reps, 20)}, (_, ri) =>
          iBlocks.map((ib, bi) => (
            <div key={`${ri}_${bi}`} style={{ flex:ib.sec, background:wattsColor(ib.watts), opacity:ib.type==='effort'?0.85:0.35, borderRight:'1px solid var(--bg-card2)' }}/>
          ))
        )}
      </div>
      {/* Apply */}
      <button
        onClick={() => { onChange({ blocks: iBlocks, reps }); onClose() }}
        style={{ width:'100%', padding:'7px', borderRadius:7, border:'none', background:`linear-gradient(135deg,${wattsColor(efW)},${wattsColor(efW)}bb)`, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
        ⚡ Appliquer ces intervalles
      </button>
    </div>
  )
}

// ── ElevationChart ────────────────────────────────
type TerrainBlockOverlay = { label: string; startKm: number; endKm: number; zone: number; value: string; blockIdx: number; color?: string }

function ElevationChart({ profile, totalKm, accent, onHover, terrainBlocks, onBlockEdgeDrag, onBlockClick, powerGauges, onGaugeWattsChange, onGaugeEdgeChange, drawModeActive, onBlockDraw, onGaugeAction }: {
  profile: Array<{ distKm: number; ele: number }>
  totalKm: number
  accent: string
  onHover?: (distKm: number | null) => void
  terrainBlocks?: TerrainBlockOverlay[]
  onBlockEdgeDrag?: (blockIdx: number, edge: 'start' | 'end', newKm: number) => void
  onBlockClick?: (blockIdx: number) => void
  powerGauges?: Array<{ blockIdx: number; startKm: number; endKm: number; watts: number; ftpRef: number; color: string; label: string; name?: string; estimatedMin: number; hrAvg?: number }>
  onGaugeWattsChange?: (blockIdx: number, newWatts: number) => void
  onGaugeEdgeChange?: (blockIdx: number, edge: 'start' | 'end', newKm: number) => void
  drawModeActive?: boolean
  onBlockDraw?: (startKm: number, endKm: number, anchorPct: number) => void
  onGaugeAction?: (blockIdx: number, action: 'modify' | 'intervals') => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState<{ x: number; distKm: number; ele: number; slope: number } | null>(null)
  const [dragging, setDragging] = useState<{ blockIdx: number; edge: 'start' | 'end' } | null>(null)
  const [gaugeDrag, setGaugeDrag] = useState<{ blockIdx: number; startY: number; startWatts: number } | null>(null)
  const [gaugeEdgeDrag, setGaugeEdgeDrag] = useState<{ blockIdx: number; edge: 'start' | 'end' } | null>(null)
  const [hoveredGauge, setHoveredGauge] = useState<number | null>(null)
  const [drawDrag, setDrawDrag] = useState<{ startKm: number; currentKm: number } | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (profile.length < 2) return null

  // DEBUG — retirer après diagnostic
  console.log('[ElevationChart] powerGauges=', powerGauges ? `${powerGauges.length} jauges` : 'undefined', powerGauges)

  const minEle = Math.min(...profile.map(p => p.ele))
  const maxEle = Math.max(...profile.map(p => p.ele))
  const eleRange = maxEle - minEle || 1

  const W = 800, H = 200
  const PL = 44, PR = 12, PT = 14, PB = 28
  const pW = W - PL - PR, pH = H - PT - PB

  const svgPoints = profile.map(p => ({
    x: PL + (p.distKm / totalKm) * pW,
    y: PT + pH - ((p.ele - minEle) / eleRange) * pH,
    distKm: p.distKm, ele: p.ele,
  }))
  const pathD = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fillD = `${pathD} L${svgPoints[svgPoints.length - 1].x.toFixed(1)},${PT + pH} L${PL},${PT + pH} Z`

  const yStep = eleRange > 500 ? 200 : eleRange > 200 ? 100 : 50
  const yTicks: number[] = []
  for (let e = Math.ceil(minEle / yStep) * yStep; e <= maxEle; e += yStep) yTicks.push(e)
  const xStep = totalKm > 150 ? 20 : totalKm > 80 ? 10 : totalKm > 30 ? 5 : totalKm > 10 ? 2 : 1
  const xTicks: number[] = []
  for (let km = 0; km <= totalKm; km += xStep) xTicks.push(Math.round(km * 10) / 10)

  function getSlopeAt(distKm: number): number {
    const idx = profile.findIndex(p => p.distKm >= distKm)
    if (idx <= 0) return 0
    const p1 = profile[idx - 1], p2 = profile[idx]
    const dDist = (p2.distKm - p1.distKm) * 1000
    if (dDist === 0) return 0
    return Math.round(((p2.ele - p1.ele) / dDist) * 1000) / 10
  }

  function svgXToKm(clientX: number): number {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    const svgX = ((clientX - rect.left) / rect.width) * W
    return Math.max(0, Math.min(totalKm, ((svgX - PL) / pW) * totalKm))
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (drawDrag) {
      const km = Math.round(svgXToKm(e.clientX) * 10) / 10
      setDrawDrag(prev => prev ? { ...prev, currentKm: km } : null)
      return
    }
    if (gaugeEdgeDrag && onGaugeEdgeChange) {
      const km = Math.round(svgXToKm(e.clientX) * 10) / 10
      onGaugeEdgeChange(gaugeEdgeDrag.blockIdx, gaugeEdgeDrag.edge, km)
      return
    }
    if (gaugeDrag && onGaugeWattsChange && powerGauges) {
      const svg = svgRef.current
      if (svg) {
        const rect2 = svg.getBoundingClientRect()
        const svgY = ((e.clientY - rect2.top) / rect2.height) * H
        const deltaY = svgY - gaugeDrag.startY
        if (powerGauges?.find(g => g.blockIdx === gaugeDrag.blockIdx)) {
          const newWatts = Math.max(50, Math.min(600, Math.round((gaugeDrag.startWatts - deltaY * 2) / 5) * 5))
          onGaugeWattsChange(gaugeDrag.blockIdx, newWatts)
        }
      }
      return
    }
    if (dragging && onBlockEdgeDrag) {
      const km = Math.round(svgXToKm(e.clientX) * 10) / 10
      onBlockEdgeDrag(dragging.blockIdx, dragging.edge, km)
      return
    }
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const distKm = Math.max(0, Math.min(totalKm, ((svgX - PL) / pW) * totalKm))
    let closest = profile[0]; let closestD = Infinity
    for (const p of profile) { const d = Math.abs(p.distKm - distKm); if (d < closestD) { closestD = d; closest = p } }
    const x = PL + (closest.distKm / totalKm) * pW
    setCursor({ x, distKm: closest.distKm, ele: closest.ele, slope: getSlopeAt(closest.distKm) })
    if (onHover) onHover(closest.distKm)
  }

  function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (drawDrag && onBlockDraw) {
      const s = Math.min(drawDrag.startKm, drawDrag.currentKm)
      const end = Math.max(drawDrag.startKm, drawDrag.currentKm)
      if (end - s >= 0.2) {
        const svg = svgRef.current
        const anchorPct = svg ? (e.clientX - svg.getBoundingClientRect().left) / svg.getBoundingClientRect().width : 0.5
        onBlockDraw(Math.round(s * 10) / 10, Math.round(end * 10) / 10, anchorPct)
      }
      setDrawDrag(null)
      return
    }
    setDragging(null); setGaugeDrag(null); setGaugeEdgeDrag(null)
  }
  function handleMouseLeave() {
    if (!dragging && !gaugeDrag && !gaugeEdgeDrag && !drawDrag) {
      setCursor(null); if (onHover) onHover(null)
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = setTimeout(() => setHoveredGauge(null), 150)
    }
  }

  // Zone colors: Z1→Z5
  const ZONE_C = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444']

  const cursorCy = cursor ? PT + pH - ((cursor.ele - minEle) / eleRange) * pH : 0
  const slopeColor = cursor
    ? cursor.slope > 5 ? '#ef4444' : cursor.slope > 2 ? '#f97316' : cursor.slope < -2 ? '#3b82f6' : 'var(--text)'
    : 'var(--text)'

  return (
    <div style={{ position: 'relative', userSelect: dragging ? 'none' : 'auto' }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', cursor: drawModeActive ? (drawDrag ? 'col-resize' : 'crosshair') : gaugeDrag ? 'ns-resize' : (dragging || gaugeEdgeDrag) ? 'ew-resize' : 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseDown={drawModeActive ? e => {
          e.stopPropagation()
          const km = Math.round(svgXToKm(e.clientX) * 10) / 10
          setDrawDrag({ startKm: km, currentKm: km })
        } : undefined}
      >
        {/* Y grid */}
        {yTicks.map(ele => {
          const y = PT + pH - ((ele - minEle) / eleRange) * pH
          return (
            <g key={`y${ele}`}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="var(--border)" strokeWidth={0.5} opacity={0.3} />
              <text x={PL - 5} y={y + 3} textAnchor="end" fontSize={7} fill="var(--text-dim)" fontFamily='"DM Mono",monospace'>{ele}m</text>
            </g>
          )
        })}
        {/* X grid */}
        {xTicks.map(km => {
          const x = PL + (km / totalKm) * pW
          return (
            <g key={`x${km}`}>
              <line x1={x} y1={PT} x2={x} y2={PT + pH} stroke="var(--border)" strokeWidth={0.5} opacity={0.2} />
              <text x={x} y={H - 6} textAnchor="middle" fontSize={7} fill="var(--text-dim)" fontFamily='"DM Mono",monospace'>{km}km</text>
            </g>
          )
        })}
        {/* Axes */}
        <line x1={PL} y1={PT} x2={PL} y2={PT + pH} stroke="var(--border)" strokeWidth={0.6} />
        <line x1={PL} y1={PT + pH} x2={W - PR} y2={PT + pH} stroke="var(--border)" strokeWidth={0.6} />
        {/* Fill */}
        <path d={fillD} fill={accent} opacity={0.05} />
        {/* Profile line */}
        <path d={pathD} fill="none" stroke={accent} strokeWidth={1} opacity={0.65} strokeLinejoin="round" />
        {/* Terrain block overlays — OVER the profile line, under cursor */}
        {terrainBlocks && !powerGauges?.length && terrainBlocks.map((block, i) => {
          if (block.startKm == null || block.endKm == null) return null
          const x1  = PL + (block.startKm / totalKm) * pW
          const x2  = PL + (block.endKm   / totalKm) * pW
          const zc  = block.color ?? ZONE_C[Math.min(Math.max(block.zone - 1, 0), 4)]
          const w   = Math.max(x2 - x1, 3)
          const clickable = !!onBlockClick
          return (
            <g key={`tb${i}`}>
              <rect
                x={x1} y={PT} width={w} height={pH} fill={zc} opacity={0.22} rx={2}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
                onClick={clickable ? e => { e.stopPropagation(); onBlockClick(block.blockIdx) } : undefined}
              />
              {/* Label above chart area */}
              {w > 18 && (
                <text x={(x1 + x2) / 2} y={PT - 2} textAnchor="middle" fontSize={7} fill={zc} fontWeight={700} fontFamily='"DM Mono",monospace'>
                  {block.value ? `${block.value}W` : `Z${block.zone}`}
                </text>
              )}
              {/* Left edge — draggable (only when no click handler) */}
              {!clickable && (
                <line x1={x1} y1={PT} x2={x1} y2={PT + pH} stroke={zc} strokeWidth={3} opacity={0.85}
                  style={{ cursor: 'ew-resize' }}
                  onMouseDown={e => { e.stopPropagation(); setDragging({ blockIdx: block.blockIdx, edge: 'start' }) }}
                />
              )}
              {/* Right edge — draggable (only when no click handler) */}
              {!clickable && (
                <line x1={x2} y1={PT} x2={x2} y2={PT + pH} stroke={zc} strokeWidth={3} opacity={0.85}
                  style={{ cursor: 'ew-resize' }}
                  onMouseDown={e => { e.stopPropagation(); setDragging({ blockIdx: block.blockIdx, edge: 'end' }) }}
                />
              )}
              {/* Colored side border always */}
              <line x1={x1} y1={PT} x2={x1} y2={PT + pH} stroke={zc} strokeWidth={clickable ? 2 : 0} opacity={0.6} />
              <line x1={x2} y1={PT} x2={x2} y2={PT + pH} stroke={zc} strokeWidth={clickable ? 2 : 0} opacity={0.6} />
            </g>
          )
        })}
        {/* Power gauges — premium design */}
        {(powerGauges ?? []).map((pg, _pgIdx) => {
          const x1 = PL + (pg.startKm / totalKm) * pW
          const x2 = PL + (pg.endKm   / totalKm) * pW
          const w  = Math.max(x2 - x1, 3)
          const gaugeH = Math.min((pg.watts / (pg.ftpRef * 1.5)) * pH, pH * 0.98)
          const yTop   = PT + pH - gaugeH
          const yBot   = PT + pH
          const isHovered = hoveredGauge === pg.blockIdx
          const isDragging = gaugeDrag?.blockIdx === pg.blockIdx
          const r4 = Math.min(6, w / 2, gaugeH / 2)

          // Zone-based gradient colors
          const zoneRatio = pg.watts / pg.ftpRef
          const GRAD_COLORS: Record<string,[string,string]> = {
            Z1: ['#9CA3AF','#D1D5DB'], Z2: ['#16A34A','#4ADE80'],
            Z3: ['#CA8A04','#FDE047'], Z4: ['#EA580C','#FB923C'],
            Z5: ['#DC2626','#F87171'], Z6: ['#9333EA','#C084FC'],
            Z7: ['#1D4ED8','#60A5FA'],
          }
          const zLbl = zoneRatio>1.50?'Z7':zoneRatio>1.20?'Z6':zoneRatio>1.05?'Z5':zoneRatio>0.87?'Z4':zoneRatio>0.75?'Z3':zoneRatio>0.55?'Z2':'Z1'
          const [gradBot, gradTop] = GRAD_COLORS[zLbl] ?? [pg.color, pg.color]
          const gradId = `g_${pg.blockIdx}`

          // Opacity per type
          const baseOpacity = pg.blockIdx <= -2000 ? 0.95 : pg.blockIdx <= -1000 ? 0.90 : 0.70
          const fillOpacity = isHovered || isDragging ? 1.0 : baseOpacity

          const hasIntervals = pg.label.startsWith('⚡')

          // Path with top-rounded corners only
          const gaugePath = `M${x1+r4},${yTop} H${x2-r4} Q${x2},${yTop} ${x2},${yTop+r4} V${yBot} H${x1} V${yTop+r4} Q${x1},${yTop} ${x1+r4},${yTop} Z`

          return (
            <g key={`pg${pg.blockIdx}`} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradTop} stopOpacity="1"/>
                  <stop offset="100%" stopColor={gradBot} stopOpacity="0.85"/>
                </linearGradient>
              </defs>
              {/* Gauge fill — gradient */}
              {hasIntervals ? (
                <path d={gaugePath}
                  fill={`url(#${gradId})`} opacity={fillOpacity * 0.6}
                  style={{ cursor: onGaugeWattsChange ? 'ns-resize' : 'default' }}
                  onMouseEnter={() => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); setHoveredGauge(pg.blockIdx) }}
                  onMouseLeave={() => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); leaveTimerRef.current = setTimeout(() => setHoveredGauge(null), 150) }}
                  onMouseDown={onGaugeWattsChange ? e => {
                    e.stopPropagation()
                    const svg2 = svgRef.current; if (!svg2) return
                    const r = svg2.getBoundingClientRect()
                    const svgY = ((e.clientY - r.top) / r.height) * H
                    setGaugeDrag({ blockIdx: pg.blockIdx, startY: svgY, startWatts: pg.watts })
                  } : undefined}
                />
              ) : (
                <path d={gaugePath}
                  fill={`url(#${gradId})`} opacity={fillOpacity}
                  style={{ cursor: onGaugeWattsChange ? 'ns-resize' : 'default' }}
                  onMouseEnter={() => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); setHoveredGauge(pg.blockIdx) }}
                  onMouseLeave={() => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); leaveTimerRef.current = setTimeout(() => setHoveredGauge(null), 150) }}
                  onMouseDown={onGaugeWattsChange ? e => {
                    e.stopPropagation()
                    const svg2 = svgRef.current; if (!svg2) return
                    const r = svg2.getBoundingClientRect()
                    const svgY = ((e.clientY - r.top) / r.height) * H
                    setGaugeDrag({ blockIdx: pg.blockIdx, startY: svgY, startWatts: pg.watts })
                  } : undefined}
                />
              )}
              {/* Interval stripe overlay */}
              {hasIntervals && (() => {
                const stripeCount = Math.floor(w / 8)
                return (
                  <g clipPath={`url(#clip_${pg.blockIdx})`} opacity={fillOpacity * 0.7}>
                    <clipPath id={`clip_${pg.blockIdx}`}>
                      <path d={gaugePath}/>
                    </clipPath>
                    {Array.from({length: stripeCount + 1}, (_, si) => {
                      const sx = x1 + si * 8
                      return <line key={si} x1={sx} y1={yTop} x2={sx} y2={yBot} stroke={gradTop} strokeWidth={3} opacity={0.6}/>
                    })}
                  </g>
                )
              })()}
              {/* Top border — vivid zone color, 2px */}
              <line x1={x1+r4} y1={yTop} x2={x2-r4} y2={yTop} stroke={gradTop} strokeWidth={2.5} strokeLinecap="round" opacity={0.95}/>
              {/* Hover elevation border */}
              {(isHovered || isDragging) && (
                <path d={gaugePath} fill="none" stroke={gradTop} strokeWidth={1.5} opacity={0.8}/>
              )}
              {/* Watts label — white bold, centered */}
              {w > 20 && gaugeH > 28 && (
                <text x={(x1+x2)/2} y={yTop+14} textAnchor="middle" fontSize={hasIntervals?9:10}
                  fill="#fff" fontWeight={900} fontFamily='"DM Mono",monospace' opacity={0.95}
                  style={{ pointerEvents:'none' }}>
                  {hasIntervals ? `⚡ ${pg.label.replace('⚡','').trim()}` : `${pg.watts}W`}
                </text>
              )}
              {w > 20 && gaugeH > 44 && !hasIntervals && (
                <text x={(x1+x2)/2} y={yTop+26} textAnchor="middle" fontSize={8}
                  fill="#fff" fontWeight={600} fontFamily='"DM Mono",monospace' opacity={0.7}
                  style={{ pointerEvents:'none' }}>
                  {zLbl}
                </text>
              )}
              {/* Draggable top edge */}
              <line x1={x1+2} y1={yTop} x2={x2-2} y2={yTop}
                stroke={gradTop} strokeWidth={6} strokeLinecap="round" opacity={1}
                style={{ cursor:'ns-resize' }}
                onMouseDown={e => {
                  e.stopPropagation()
                  const svg2 = svgRef.current; if (!svg2) return
                  const r = svg2.getBoundingClientRect()
                  const svgY = ((e.clientY - r.top) / r.height) * H
                  setGaugeDrag({ blockIdx: pg.blockIdx, startY: svgY, startWatts: pg.watts })
                }}
              />
              {/* Left/Right edge handles — only for specificBlocks */}
              {onGaugeEdgeChange && pg.blockIdx <= -2000 && (
                <>
                  <rect x={x1-4} y={yTop+(gaugeH-20)/2} width={8} height={20}
                    rx={3} fill={gradTop} opacity={0.85}
                    style={{ cursor:'ew-resize' }}
                    onMouseDown={e => { e.stopPropagation(); setGaugeEdgeDrag({ blockIdx: pg.blockIdx, edge: 'start' }) }}/>
                  <line x1={x1} y1={yTop+gaugeH*0.3} x2={x1} y2={yBot} stroke={gradTop} strokeWidth={2.5} opacity={0.7}
                    style={{ cursor:'ew-resize' }}
                    onMouseDown={e => { e.stopPropagation(); setGaugeEdgeDrag({ blockIdx: pg.blockIdx, edge: 'start' }) }}/>
                  <rect x={x2-4} y={yTop+(gaugeH-20)/2} width={8} height={20}
                    rx={3} fill={gradTop} opacity={0.85}
                    style={{ cursor:'ew-resize' }}
                    onMouseDown={e => { e.stopPropagation(); setGaugeEdgeDrag({ blockIdx: pg.blockIdx, edge: 'end' }) }}/>
                  <line x1={x2} y1={yTop+gaugeH*0.3} x2={x2} y2={yBot} stroke={gradTop} strokeWidth={2.5} opacity={0.7}
                    style={{ cursor:'ew-resize' }}
                    onMouseDown={e => { e.stopPropagation(); setGaugeEdgeDrag({ blockIdx: pg.blockIdx, edge: 'end' }) }}/>
                </>
              )}
            </g>
          )
        })}
        {/* Draw mode preview */}
        {drawDrag && (() => {
          const x1 = PL + (Math.min(drawDrag.startKm, drawDrag.currentKm) / totalKm) * pW
          const x2 = PL + (Math.max(drawDrag.startKm, drawDrag.currentKm) / totalKm) * pW
          const w  = Math.max(x2 - x1, 1)
          return (
            <g>
              <rect x={x1} y={PT} width={w} height={pH} fill="#f97316" opacity={0.18} rx={3} />
              <line x1={x1} y1={PT} x2={x1} y2={PT + pH} stroke="#f97316" strokeWidth={2} opacity={0.9} strokeDasharray="4 2" />
              <line x1={x2} y1={PT} x2={x2} y2={PT + pH} stroke="#f97316" strokeWidth={2} opacity={0.9} strokeDasharray="4 2" />
              <text x={(x1 + x2) / 2} y={PT + 14} textAnchor="middle" fontSize={8} fill="#f97316" fontWeight={800} fontFamily='"DM Mono",monospace'>
                {Math.abs(drawDrag.currentKm - drawDrag.startKm).toFixed(1)} km
              </text>
            </g>
          )
        })()}
        {/* min/max labels */}
        <text x={PL + 6} y={PT + pH - 6} fontSize={8} fill="var(--text-dim)" fontFamily='"DM Mono",monospace'>{Math.round(minEle)}m</text>
        <text x={W - PR - 6} y={PT + 10} textAnchor="end" fontSize={8} fill={accent} fontWeight={600} fontFamily='"DM Mono",monospace'>{Math.round(maxEle)}m</text>
        {/* Cursor */}
        {cursor && !dragging && (
          <g>
            <line x1={cursor.x} y1={PT} x2={cursor.x} y2={PT + pH} stroke={accent} strokeWidth={0.6} strokeDasharray="3 2" opacity={0.5} />
            <circle cx={cursor.x} cy={cursorCy} r={3} fill={accent} stroke="#fff" strokeWidth={1.5} />
          </g>
        )}
      </svg>
      {/* HTML tooltip flottante au-dessus des jauges */}
      {hoveredGauge !== null && !gaugeDrag && (() => {
        const pg = powerGauges?.find(g => g.blockIdx === hoveredGauge)
        if (!pg) return null
        const x1t = PL + (pg.startKm / totalKm) * pW
        const x2t = PL + (pg.endKm   / totalKm) * pW
        const gaugeHt = Math.min((pg.watts / (pg.ftpRef * 1.5)) * pH, pH * 0.98)
        const yTopt = PT + pH - gaugeHt
        const xCenterPct = (x1t + x2t) / 2 / W * 100
        const yTopPct    = yTopt / H * 100

        // Zone
        const zoneRatioT = pg.watts / pg.ftpRef
        const GRAD_COLORS_T: Record<string,[string,string]> = {
          Z1:['#9CA3AF','#D1D5DB'],Z2:['#16A34A','#4ADE80'],Z3:['#CA8A04','#FDE047'],
          Z4:['#EA580C','#FB923C'],Z5:['#DC2626','#F87171'],Z6:['#9333EA','#C084FC'],Z7:['#1D4ED8','#60A5FA'],
        }
        const ZONE_NAMES: Record<string,string> = {
          Z1:'Z1 — Récup',Z2:'Z2 — EF',Z3:'Z3 — Tempo',Z4:'Z4 — Seuil',
          Z5:'Z5 — VO2max',Z6:'Z6 — Anaérobie',Z7:'Z7 — Sprint',
        }
        const zLblT = zoneRatioT>1.50?'Z7':zoneRatioT>1.20?'Z6':zoneRatioT>1.05?'Z5':zoneRatioT>0.87?'Z4':zoneRatioT>0.75?'Z3':zoneRatioT>0.55?'Z2':'Z1'
        const [,gradTopT] = GRAD_COLORS_T[zLblT] ?? [pg.color, pg.color]

        // Avg slope & D+
        const startPt = profile.find(p => p.distKm >= pg.startKm) ?? profile[0]
        const endPt   = [...profile].reverse().find(p => p.distKm <= pg.endKm) ?? profile[profile.length - 1]
        const distT   = Math.max(0.01, pg.endKm - pg.startKm)
        const slopeT  = Math.round(((endPt.ele - startPt.ele) / (distT * 1000)) * 1000) / 10
        let dPlusT = 0
        for (let ii = 1; ii < profile.length; ii++) {
          if (profile[ii].distKm > pg.endKm) break
          if (profile[ii].distKm >= pg.startKm) {
            const delta = profile[ii].ele - profile[ii - 1].ele
            if (delta > 0) dPlusT += delta
          }
        }

        const tooltipTitle = pg.name ?? pg.label
        const rows: [string,string,string][] = [
          ['⚡','Watts',`${pg.watts}W`],
          ['🏷','Zone', ZONE_NAMES[zLblT] ?? zLblT],
          ['⏱','Durée',`${pg.estimatedMin.toFixed(0)} min`],
          ['📍','km',`${pg.startKm.toFixed(1)} → ${pg.endKm.toFixed(1)}`],
          ['📈','Pente',`${slopeT > 0 ? '+' : ''}${slopeT}%`],
          ['🏔','D+',`${Math.round(dPlusT)}m`],
          ...(pg.hrAvg ? [['❤️','FC cible',`~${pg.hrAvg} bpm`] as [string,string,string]] : []),
        ]

        return (
          <div
            key={`tooltip-${pg.blockIdx}`}
            onMouseEnter={() => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current) }}
            onMouseLeave={() => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); leaveTimerRef.current = setTimeout(() => setHoveredGauge(null), 150) }}
            style={{
              position: 'absolute',
              left: `${xCenterPct}%`,
              top: `${yTopPct}%`,
              transform: 'translateX(-50%) translateY(calc(-100% - 10px))',
              background: 'var(--bg-card)',
              borderRadius: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: `1.5px solid ${gradTopT}50`,
              padding: '10px 14px',
              minWidth: 210,
              zIndex: 50,
              pointerEvents: 'auto',
              userSelect: 'none',
            }}
          >
            {/* Title */}
            <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 7, borderBottom: '1px solid var(--border)', paddingBottom: 6, color: gradTopT }}>
              {tooltipTitle}
            </div>
            {/* Data rows */}
            {rows.map(([icon, label, val], ri) => (
              <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 4 }}>
                <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
                <span style={{ color: 'var(--text-dim)', flex: 1 }}>{label}</span>
                <span style={{ fontWeight: 700, fontFamily: '"DM Mono",monospace', color: ri === 0 ? gradTopT : 'var(--text)' }}>{val}</span>
              </div>
            ))}
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setHoveredGauge(null); onGaugeAction?.(pg.blockIdx, 'modify') }}
                style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 10, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}
              >
                Modifier
              </button>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setHoveredGauge(null); onGaugeAction?.(pg.blockIdx, 'intervals') }}
                style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${gradTopT}60`, background: `${gradTopT}15`, fontSize: 10, fontWeight: 700, cursor: 'pointer', color: gradTopT }}
              >
                ⚡ Intervalles
              </button>
            </div>
          </div>
        )
      })()}
      {/* Tooltip sous le SVG */}
      {cursor && !dragging && (
        <div style={{
          display: 'flex', gap: 16, padding: '7px 12px',
          borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)',
          marginTop: 5, fontSize: 11, justifyContent: 'center', flexWrap: 'wrap' as const,
        }}>
          <span style={{ color: 'var(--text-dim)' }}>km <strong style={{ color: 'var(--text)', fontFamily: '"DM Mono",monospace' }}>{cursor.distKm.toFixed(1)}</strong></span>
          <span style={{ color: 'var(--text-dim)' }}>altitude <strong style={{ color: accent, fontFamily: '"DM Mono",monospace' }}>{cursor.ele}m</strong></span>
          <span style={{ color: 'var(--text-dim)' }}>pente <strong style={{ color: slopeColor, fontFamily: '"DM Mono",monospace' }}>{cursor.slope > 0 ? '+' : ''}{cursor.slope}%</strong></span>
        </div>
      )}
    </div>
  )
}

// ── Carte GPS Leaflet (client-side only) ─────────
function GPSMapInner({ trace, accent, hoveredKm, elevationProfile }: {
  trace: Array<{ lat: number; lon: number }>
  accent: string
  hoveredKm: number | null
  elevationProfile: Array<{ distKm: number; ele: number }>
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const cursorMarkerRef = useRef<unknown>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)

  // Init map once
  useEffect(() => {
    if (!mapRef.current || trace.length < 2) return
    const container = mapRef.current
    if ((container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return

    import('leaflet').then(L => {
      leafletRef.current = L
      delete (L.Icon.Default.prototype as unknown as Record<string,unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      const map = L.map(container, { zoomControl: true, scrollWheelZoom: true, attributionControl: false })
      mapInstanceRef.current = map

      // Layers
      const mbToken = process.env.NEXT_PUBLIC_MAPBOX ?? ''
      const mbAttr = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      const mbOpts = { maxZoom: 20, tileSize: 512, zoomOffset: -1, attribution: mbAttr }
      const osmLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mbToken}`, mbOpts)
      const satLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mbToken}`, mbOpts)
      const hybridLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=${mbToken}`, mbOpts)
      osmLayer.addTo(map)
      L.control.layers({ 'Standard': osmLayer, 'Satellite': satLayer, 'Hybride': hybridLayer }, {}, { position: 'topright', collapsed: false }).addTo(map)

      // Trace
      const latlngs = trace.map(p => [p.lat, p.lon] as [number, number])
      const poly = L.polyline(latlngs, { color: accent, weight: 3, opacity: 0.85, smoothFactor: 1.5 }).addTo(map)
      const dot = (color: string) => L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
        iconSize: [10, 10], iconAnchor: [5, 5], className: '',
      })
      L.marker(latlngs[0], { icon: dot('#22c55e') }).addTo(map)
      L.marker(latlngs[latlngs.length - 1], { icon: dot('#ef4444') }).addTo(map)
      map.fitBounds(poly.getBounds(), { padding: [18, 18] })

      // Cursor marker (hidden initially)
      const cursorIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.5)"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6], className: '',
      })
      const cursorMarker = L.marker(latlngs[0], { icon: cursorIcon, opacity: 0, zIndexOffset: 1000 }).addTo(map)
      cursorMarkerRef.current = cursorMarker
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync cursor marker with hoveredKm
  useEffect(() => {
    const marker = cursorMarkerRef.current as { setLatLng: (ll: [number,number]) => void; setOpacity: (o: number) => void } | null
    const L = leafletRef.current
    if (!marker || !L) return
    if (hoveredKm === null || elevationProfile.length === 0 || trace.length < 2) {
      marker.setOpacity(0)
      return
    }
    const totalKm = elevationProfile[elevationProfile.length - 1].distKm
    const ratio = totalKm > 0 ? hoveredKm / totalKm : 0
    const traceIdx = Math.min(Math.max(0, Math.round(ratio * (trace.length - 1))), trace.length - 1)
    const pt = trace[traceIdx]
    if (!pt) return
    marker.setLatLng([pt.lat, pt.lon])
    marker.setOpacity(1)
  }, [hoveredKm, elevationProfile, trace])

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
      <div ref={mapRef} style={{ width: '100%', height: 400, borderRadius: 10, overflow: 'hidden', zIndex: 0 }}/>
    </>
  )
}

function GPSMapWrapper({ trace, accent, hoveredKm, elevationProfile }: {
  trace: Array<{ lat: number; lon: number }>
  accent: string
  hoveredKm: number | null
  elevationProfile: Array<{ distKm: number; ele: number }>
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return (
    <div style={{ width: '100%', height: 400, borderRadius: 10, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 11 }}>
      Chargement de la carte…
    </div>
  )
  return <GPSMapInner trace={trace} accent={accent} hoveredKm={hoveredKm} elevationProfile={elevationProfile}/>
}

// ── Session averages estimation ───────────────────
function computeSessionAverages(blocks: Block[], sport: SportType): {
  avgWatts: number | null; avgPace: string | null
} {
  if (blocks.length === 0) return { avgWatts: null, avgPace: null }

  if (sport === 'bike' || sport === 'elliptique') {
    let totalMin = 0, totalWattMin = 0
    for (const b of blocks) {
      const w = parseInt(b.value) || 0
      if (w <= 0) continue
      const min = b.mode === 'interval' && b.reps && b.effortMin
        ? b.reps * b.effortMin : b.durationMin
      totalMin += min; totalWattMin += min * w
    }
    if (totalMin === 0 || totalWattMin === 0) return { avgWatts: null, avgPace: null }
    return { avgWatts: Math.round(totalWattMin / totalMin), avgPace: null }
  }

  if (sport === 'run' || sport === 'swim' || sport === 'rowing') {
    let totalMin = 0, totalPaceSecMin = 0
    for (const b of blocks) {
      const m = (b.value ?? '').match(/(\d+):(\d+)/)
      if (!m) continue
      const paceSec = parseInt(m[1]) * 60 + parseInt(m[2])
      const min = b.mode === 'interval' && b.reps && b.effortMin
        ? b.reps * b.effortMin : b.durationMin
      totalMin += min; totalPaceSecMin += min * paceSec
    }
    if (totalMin === 0 || totalPaceSecMin === 0) return { avgWatts: null, avgPace: null }
    const avg = Math.round(totalPaceSecMin / totalMin)
    const str = `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, '0')}`
    const unit = sport === 'swim' ? '/100m' : sport === 'rowing' ? '/500m' : '/km'
    return { avgWatts: null, avgPace: str + unit }
  }

  return { avgWatts: null, avgPace: null }
}

// ══════════════════════════════════════════════════════════════
// SESSION EXECUTE — Mode exécution muscu en direct
// ══════════════════════════════════════════════════════════════

interface ExecExercise {
  id: string
  label: string
  targetSets: number
  targetReps: number
  targetWeight: string
  restSec: number
  effortMin: number
  notes: string
  logSets: Array<{
    reps: number
    weight: string
    note: 'easy' | 'ok' | 'hard' | 'fail' | ''
    completedAt: number
  }>
}

interface SessionLog {
  startedAt: number
  endedAt: number | null
  totalSets: number
  totalReps: number
  totalTonnage: number
  totalRestSec: number
  exercises: ExecExercise[]
}

// ── V2 SessionExecute — Types internes ────────────────────────
interface ExecExo {
  id: string
  label: string
  targetSets: number
  targetReps: number
  targetWeight: string
  restSec: number
  logSets: Array<{ reps: number; weight: string; note: string; ts: number }>
}
interface ExecCircuit {
  label: string
  rounds: number
  type: CircuitType
  durationMin: number
  restBetweenRoundsSec: number
  exos: ExecExo[]
}

function buildExecCircuits(blocks: Block[]): ExecCircuit[] {
  const result: ExecCircuit[] = []
  let current: ExecCircuit | null = null
  for (const b of blocks) {
    if (b.type === 'circuit_header') {
      const ct: CircuitType = (['series','circuit','superset','emom','tabata'].includes(b.mode) ? b.mode : 'series') as CircuitType
      current = {
        label: b.label || 'Circuit',
        rounds: ct === 'tabata' ? 8 : (b.zone || 1),
        type: ct,
        durationMin: b.durationMin || 0,
        restBetweenRoundsSec: b.recoveryMin ? Math.round(b.recoveryMin * 60) : 90,
        exos: [],
      }
      result.push(current)
    } else {
      if (!current) {
        current = { label: 'Séance', rounds: 1, type: 'series', durationMin: 0, restBetweenRoundsSec: 90, exos: [] }
        result.push(current)
      }
      current.exos.push({
        id: b.id,
        label: b.label,
        targetSets: b.zone ?? 3,
        targetReps: b.reps ?? 10,
        targetWeight: b.value || '',
        restSec: b.recoveryMin ? Math.round(b.recoveryMin * 60) : 90,
        logSets: [],
      })
    }
  }
  return result.filter(c => c.exos.length > 0)
}

// ── Ordre d'exécution selon le type de circuit ──
function getExecutionOrder(circ: ExecCircuit): Array<{ exoIdx: number; setIdx: number }> {
  const order: Array<{ exoIdx: number; setIdx: number }> = []
  const n = circ.exos.length
  if (n === 0) return order

  switch (circ.type) {
    case 'series':
      // Toutes les séries d'un exo, puis le suivant
      for (let e = 0; e < n; e++) {
        const sets = circ.exos[e].targetSets
        for (let s = 0; s < sets; s++) order.push({ exoIdx: e, setIdx: s })
      }
      break

    case 'circuit':
    case 'superset':
      // Enchaîner tous les exos, recommencer X rounds
      for (let r = 0; r < circ.rounds; r++) {
        for (let e = 0; e < n; e++) order.push({ exoIdx: e, setIdx: r })
      }
      break

    case 'emom': {
      // Alterner les exos chaque minute pendant durationMin minutes
      const totalMin = circ.durationMin > 0 ? circ.durationMin : 12
      for (let m = 0; m < totalMin; m++) {
        order.push({ exoIdx: m % n, setIdx: Math.floor(m / n) })
      }
      break
    }

    case 'tabata':
      // 8 rounds × alternance des exos
      for (let r = 0; r < 8; r++) {
        order.push({ exoIdx: r % n, setIdx: r })
      }
      break

    default:
      for (let e = 0; e < n; e++) {
        const sets = circ.exos[e].targetSets
        for (let s = 0; s < sets; s++) order.push({ exoIdx: e, setIdx: s })
      }
  }
  return order
}

type ExecStep = { circuitIdx: number; exoIdx: number; setIdx: number }

const MOTIVATIONAL_MSGS = [
  'Allez, tu gères ! 💪', 'En feu 🔥', 'Continue comme ça !',
  'Tu es au sommet !', 'Reste focus.', 'Chaque série compte.',
  'Mental fort !', 'Champion. 🏆', 'C\'est parti !', 'Bien joué !',
]

function SessionExecute({ blocks, sport, sessionTitle, onExit, onSaveLog, exoHistory }: {
  blocks: Block[]
  sport: SportType
  sessionTitle: string
  onExit: () => void
  onSaveLog?: (log: SessionLog) => void
  exoHistory?: Record<string, { weight: string; reps: number; date: string }>
}) {
  const accent = SPORT_BORDER[sport]
  const fmtTimer = (sec: number) => `${Math.floor(Math.max(0,sec) / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`

  const initialCircuits = buildExecCircuits(blocks)

  // Construire la séquence complète d'exécution
  const initialSequence: ExecStep[] = []
  initialCircuits.forEach((c, ci) => {
    getExecutionOrder(c).forEach(o => initialSequence.push({ circuitIdx: ci, ...o }))
  })

  const [circuits, setCircuits] = useState<ExecCircuit[]>(initialCircuits)
  const [execSequence]          = useState<ExecStep[]>(initialSequence)
  const [execPos, setExecPos]   = useState(0)
  const [phase, setPhase]       = useState<'ready' | 'countdown' | 'work' | 'rest' | 'paused' | 'done'>('ready')
  const [countdownSec, setCountdownSec] = useState(5)
  const [restRemaining, setRestRemaining] = useState(0)
  const [restTotal, setRestTotal] = useState(0)
  const [sessionStartTs, setSessionStartTs] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [pausedAt, setPausedAt] = useState(0)
  const [totalPausedSec, setTotalPausedSec] = useState(0)
  const [totalRestAccum, setTotalRestAccum] = useState(0)
  const [vibrateEnabled, setVibrateEnabled] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [motivMsg, setMotivMsg] = useState('')
  const [replaceSearch, setReplaceSearch] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [prevPhase, setPrevPhase] = useState<'work' | 'rest'>('work')
  const [editingSet, setEditingSet] = useState<{ reps: number; weight: string } | null>(null)

  const restTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cdTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  // Dériver l'exo courant depuis execPos
  const currentStep    = execSequence[execPos] ?? null
  const currentCircuit = currentStep ? (circuits[currentStep.circuitIdx] ?? null) : null
  const currentExo     = currentStep && currentCircuit ? (currentCircuit.exos[currentStep.exoIdx] ?? null) : null
  const nextStep       = execSequence[execPos + 1] ?? null
  const nextCircuit    = nextStep ? (circuits[nextStep.circuitIdx] ?? null) : null
  const nextExo        = nextStep && nextCircuit ? (nextCircuit.exos[nextStep.exoIdx] ?? null) : null
  const currentSetNum  = (currentStep?.setIdx ?? 0) + 1

  // Totaux
  const totalSetsAll  = circuits.reduce((s,c) => s + c.exos.reduce((ss,e) => ss + e.logSets.length, 0), 0)
  const totalReps     = circuits.reduce((s,c) => s + c.exos.reduce((ss,e) => ss + e.logSets.reduce((sss,set) => sss + set.reps, 0), 0), 0)
  const totalTonnage  = circuits.reduce((s,c) => s + c.exos.reduce((ss,e) => ss + e.logSets.reduce((sss,set) => sss + (parseFloat(set.weight)||0)*set.reps, 0), 0), 0)
  const totalExosCount = circuits.reduce((s,c) => s + c.exos.length, 0)

  // Progression globale
  const progressPct = execSequence.length > 0 ? Math.min(1, execPos / execSequence.length) : 0

  // ── Countdown ──
  useEffect(() => {
    if (phase !== 'countdown') return
    cdTimerRef.current = setInterval(() => {
      setCountdownSec(s => {
        if (s <= 1) { clearInterval(cdTimerRef.current!); setPhase('work'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (cdTimerRef.current) clearInterval(cdTimerRef.current) }
  }, [phase])

  // ── Elapsed (hors pause) ──
  useEffect(() => {
    if (phase === 'ready' || phase === 'countdown' || phase === 'done' || phase === 'paused') return
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(e => e + 1)
      if (phase === 'rest') setTotalRestAccum(r => r + 1)
    }, 1000)
    return () => { if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current) }
  }, [phase])

  // ── Rest timer ──
  useEffect(() => {
    if (phase !== 'rest' || restRemaining <= 0) return
    restTimerRef.current = setInterval(() => {
      setRestRemaining(r => {
        if (r <= 1) {
          clearInterval(restTimerRef.current!)
          setPhase('work')
          if (vibrateEnabled && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200])
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current) }
  }, [phase, restRemaining, vibrateEnabled])

  function startSession() {
    setSessionStartTs(Date.now())
    setCountdownSec(5)
    setPhase('countdown')
  }

  function startRest(sec: number) {
    setRestTotal(sec)
    setRestRemaining(sec)
    setPhase('rest')
  }

  function pickMotiv() {
    setMotivMsg(MOTIVATIONAL_MSGS[Math.floor(Math.random() * MOTIVATIONAL_MSGS.length)])
  }

  function advanceToNextStep(pos: number) {
    if (pos + 1 >= execSequence.length) {
      setPhase('done'); setShowConfetti(true); pickMotiv(); return
    }
    const nextS = execSequence[pos + 1]
    const nextC = circuits[nextS.circuitIdx]
    const nextE = nextC?.exos[nextS.exoIdx]
    setExecPos(pos + 1)

    // Repos selon le type de circuit
    const cType = currentCircuit?.type ?? 'series'
    if (cType === 'tabata') {
      // Tabata : toujours 10s de repos
      startRest(10)
    } else if (cType === 'emom') {
      // EMOM : repos = temps restant dans la minute (simplifié : 15s)
      startRest(15)
    } else if (cType === 'circuit') {
      // Lap : repos après chaque exo, repos de fin de tour entre les tours
      const isEndOfRound = nextS.exoIdx === 0 && nextS.setIdx !== currentStep?.setIdx
      const restSec = isEndOfRound
        ? (currentCircuit?.restBetweenRoundsSec ?? 90)
        : (currentExo?.restSec ?? 60)
      if (restSec > 0) {
        startRest(restSec)
      } else {
        setPhase('work')
      }
    } else if (cType === 'superset') {
      // Superset : pas de repos entre exos, repos seulement en fin de tour
      const isEndOfRound = nextS.exoIdx === 0 && nextS.setIdx !== currentStep?.setIdx
      if (isEndOfRound) {
        startRest(currentCircuit?.restBetweenRoundsSec ?? 90)
      } else {
        setPhase('work') // pas de repos entre exos du superset
      }
    } else {
      // Séries : repos seulement quand on passe à un nouvel exercice, pas entre les séries du même exo
      const isNewExo = nextS.exoIdx !== currentStep?.exoIdx || nextS.circuitIdx !== currentStep?.circuitIdx
      if (isNewExo && (currentExo?.restSec ?? 0) > 0) {
        startRest(currentExo!.restSec)
      } else {
        setPhase('work')
      }
    }
  }

  function validateSet(note: string = 'ok', overrideReps?: number, overrideWeight?: string) {
    if (!currentCircuit || !currentExo || !currentStep) return
    const { circuitIdx: ci, exoIdx: ei } = currentStep
    const reps   = overrideReps   ?? editingSet?.reps   ?? currentExo.targetReps
    const weight = overrideWeight ?? editingSet?.weight ?? currentExo.targetWeight
    const updatedCircuits = circuits.map((c, cii) =>
      cii !== ci ? c : {
        ...c,
        exos: c.exos.map((e, eii) =>
          eii !== ei ? e : {
            ...e,
            logSets: [...e.logSets, { reps, weight, note, ts: Date.now() }]
          }
        )
      }
    )
    setCircuits(updatedCircuits)
    setEditingSet(null)
    pickMotiv()
    advanceToNextStep(execPos)
  }

  function updateExoField(field: 'targetReps' | 'targetWeight', value: number | string) {
    if (!currentStep) return
    const { circuitIdx: ci, exoIdx: ei } = currentStep
    setCircuits(prev => prev.map((c, cii) =>
      cii !== ci ? c : {
        ...c,
        exos: c.exos.map((e, eii) =>
          eii !== ei ? e : { ...e, [field]: value }
        )
      }
    ))
  }

  function adjustRest(delta: number) {
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    setRestRemaining(r => Math.max(0, r + delta))
    setRestTotal(t => Math.max(0, t + delta))
  }

  function skipRest() {
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    setRestRemaining(0)
    setPhase('work')
  }

  function skipExo() {
    if (execPos + 1 >= execSequence.length) {
      setPhase('done'); setShowConfetti(true); pickMotiv()
    } else {
      setExecPos(p => p + 1)
      setPhase('work')
    }
  }

  function togglePause() {
    if (phase === 'paused') {
      const dur = Math.round((Date.now() - pausedAt) / 1000)
      setTotalPausedSec(s => s + dur)
      setPhase(prevPhase)
    } else if (phase === 'work' || phase === 'rest') {
      setPrevPhase(phase)
      setPausedAt(Date.now())
      if (restTimerRef.current) clearInterval(restTimerRef.current)
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
      setPhase('paused')
    }
  }

  function replaceExo(newLabel: string) {
    if (!currentStep) return
    const { circuitIdx: ci, exoIdx: ei } = currentStep
    setCircuits(prev => prev.map((c, cii) =>
      cii !== ci ? c : {
        ...c,
        exos: c.exos.map((e, eii) =>
          eii !== ei ? e : { ...e, label: newLabel, logSets: [] }
        )
      }
    ))
    setReplaceSearch(null); setSearchQuery('')
  }

  const NOTE_CONFIG = [
    { id: 'easy', label: 'Facile', color: '#22c55e' },
    { id: 'ok',   label: 'OK',    color: '#9ca3af' },
    { id: 'hard', label: 'Dur',   color: '#f97316' },
    { id: 'fail', label: 'Échec', color: '#ef4444' },
  ]

  // ── PHASE : READY ──
  if (phase === 'ready') {
    return (
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed' as const, inset: 0, zIndex: 2000, background: 'var(--bg)', color: 'var(--text)', overflowY: 'auto' as const }}>
        <div style={{ padding: '80px 24px 28px', maxWidth: 500, margin: '0 auto' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px' }}>Prêt à lancer</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px', fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>{sessionTitle}</h1>
          {circuits.map((circ, ci) => (
            <div key={ci} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 6px' }}>
                {circ.label}
                {circ.type !== 'series' && circ.rounds > 1 ? ` · ${circ.rounds} tours` : ''}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                {circ.exos.map((exo, ei) => (
                  <div key={exo.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: '"DM Mono",monospace', width: 18, flexShrink: 0 }}>{ei + 1}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{exo.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontFamily: '"DM Mono",monospace' }}>
                        {circ.type === 'series'
                          ? `${exo.targetSets}×${exo.targetReps}${exo.targetWeight ? ` @${exo.targetWeight}kg` : ''}`
                          : `${exo.targetReps} reps${exo.targetWeight ? ` @${exo.targetWeight}kg` : ''}`
                        }
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: '"DM Mono",monospace' }}>{fmtTimer(exo.restSec)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-mid)', cursor: 'pointer' }}>
              <input type="checkbox" checked={vibrateEnabled} onChange={e => setVibrateEnabled(e.target.checked)} style={{ width: 14, height: 14, accentColor: accent }} />
              Vibration fin de repos
            </label>
          </div>
          <button onClick={startSession} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne, sans-serif', letterSpacing: '0.02em' }}>
            ▶ Lancer la séance
          </button>
          <button onClick={onExit} style={{ width: '100%', padding: '12px', borderRadius: 10, marginTop: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
        </div>
      </div>
    )
  }

  // ── PHASE : COUNTDOWN ──
  if (phase === 'countdown') {
    return (
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed' as const, inset: 0, zIndex: 2000, background: 'var(--bg)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 20px', fontWeight: 600 }}>Prépare-toi</p>
        <div style={{ fontSize: 100, fontWeight: 900, fontFamily: '"DM Mono",monospace', color: accent, lineHeight: 1, animation: 'pulse 1s ease-in-out infinite' }}>{countdownSec}</div>
        <p style={{ fontSize: 14, color: 'var(--text)', margin: '24px 0 0', fontWeight: 600 }}>{currentCircuit?.exos[0]?.label ?? sessionTitle}</p>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '6px 0 0' }}>
          {currentCircuit?.exos[0]?.targetSets}×{currentCircuit?.exos[0]?.targetReps}
          {currentCircuit?.exos[0]?.targetWeight ? ` @${currentCircuit?.exos[0]?.targetWeight}kg` : ''}
        </p>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.92)}}`}</style>
      </div>
    )
  }

  // ── PHASE : DONE ──
  if (phase === 'done') {
    const confettiColors = [accent, '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#eab308']
    const allExos = circuits.flatMap(c => c.exos)
    return (
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed' as const, inset: 0, zIndex: 2000, background: 'var(--bg)', color: 'var(--text)', overflowY: 'auto' as const }}>
        <style>{`
          @keyframes confetti-fall{
            0%{transform:translateY(-20px) rotate(0deg);opacity:1}
            100%{transform:translateY(110vh) rotate(720deg);opacity:0}
          }
          @keyframes trophy-bounce{
            0%,100%{transform:scale(1)}
            50%{transform:scale(1.15)}
          }
        `}</style>
        {showConfetti && (
          <div style={{ position: 'fixed' as const, inset: 0, pointerEvents: 'none' as const, overflow: 'hidden', zIndex: 1200 }}>
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} style={{
                position: 'absolute' as const,
                left: `${(i * 3.1) % 100}%`,
                top: '-12px',
                width: 7 + (i % 4), height: 7 + (i % 4),
                borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? 2 : 0,
                background: confettiColors[i % confettiColors.length],
                animation: `confetti-fall ${1.4 + (i % 5) * 0.4}s ease-in ${(i % 6) * 0.15}s forwards`,
                opacity: 0,
              }} />
            ))}
          </div>
        )}
        <div style={{ padding: '80px 24px 32px', maxWidth: 500, margin: '0 auto', textAlign: 'center' as const }}>
          <div style={{ fontSize: 56, marginBottom: 8, display: 'inline-block', animation: 'trophy-bounce 1.2s ease-in-out 3' }}>🏆</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Syne, sans-serif', margin: '0 0 4px', color: 'var(--text)' }}>Séance terminée !</h2>
          {motivMsg && <p style={{ fontSize: 14, color: accent, fontWeight: 700, margin: '0 0 24px' }}>{motivMsg}</p>}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {([
              { label: 'Durée',     value: fmtTimer(elapsed) },
              { label: 'Séries',    value: String(totalSetsAll) },
              { label: 'Reps',      value: String(totalReps) },
              { label: 'Tonnage',   value: `${Math.round(totalTonnage)}kg` },
              { label: 'Repos',     value: fmtTimer(totalRestAccum) },
              { label: 'Exercices', value: String(totalExosCount) },
            ] as { label: string; value: string }[]).map(kpi => (
              <div key={kpi.label} style={{ padding: '10px 6px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 8, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', margin: '0 0 3px' }}>{kpi.label}</p>
                <p style={{ fontSize: 15, fontWeight: 800, fontFamily: '"DM Mono",monospace', color: accent, margin: 0 }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Détail exercices */}
          <div style={{ textAlign: 'left' as const, marginBottom: 20 }}>
            {circuits.map((circ, ci) => (
              <div key={ci} style={{ marginBottom: 14 }}>
                {circuits.length > 1 && (
                  <p style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px' }}>{circ.label}</p>
                )}
                {circ.exos.filter(e => e.logSets.length > 0).map(e => (
                  <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{e.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: '"DM Mono",monospace' }}>{e.logSets.length} séries</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                      {e.logSets.map((set, si) => (
                        <span key={si} style={{
                          fontSize: 10, fontFamily: '"DM Mono",monospace', padding: '3px 8px', borderRadius: 5,
                          background: set.note === 'fail' ? 'rgba(239,68,68,0.12)' : set.note === 'hard' ? 'rgba(249,115,22,0.12)' : 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          color: set.note === 'fail' ? '#ef4444' : set.note === 'hard' ? '#f97316' : 'var(--text-mid)',
                        }}>
                          {set.weight ? `${set.weight}×` : ''}{set.reps}{set.note && set.note !== 'ok' ? ` · ${set.note}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Sync montre */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 20, textAlign: 'left' as const }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>📡 Corréler avec votre montre</p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
              Vos données Strava, Garmin, Polar ou Suunto seront synchronisées automatiquement dans la page Activités après votre prochaine sync.
            </p>
          </div>

          <button onClick={() => {
            onSaveLog?.({
              startedAt: sessionStartTs, endedAt: Date.now(),
              totalSets: totalSetsAll, totalReps,
              totalTonnage: Math.round(totalTonnage), totalRestSec: totalRestAccum,
              exercises: allExos.map(e => ({
                ...e, effortMin: 0, notes: '',
                logSets: e.logSets.map(s => ({
                  reps: s.reps, weight: s.weight,
                  note: (['easy','ok','hard','fail',''].includes(s.note) ? s.note : 'ok') as ExecExercise['logSets'][0]['note'],
                  completedAt: s.ts,
                })),
              })),
            })
            onExit()
          }} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
            ✓ Terminer et sauvegarder
          </button>
          <button onClick={onExit} style={{ width: '100%', padding: '11px', borderRadius: 10, marginTop: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>Fermer sans sauvegarder</button>
        </div>
      </div>
    )
  }

  // ── PHASE : WORK / REST / PAUSED ──
  const circumference = 2 * Math.PI * 72
  const progressArc = restTotal > 0 ? ((1 - restRemaining / restTotal) * circumference) : 0

  // Editing values (fallback to target)
  const editReps   = editingSet?.reps   ?? currentExo?.targetReps   ?? 0
  const editWeight = editingSet?.weight ?? currentExo?.targetWeight ?? ''

  const ct     = currentCircuit?.type ?? 'series'
  const ctInfo = CIRCUIT_TYPES.find(c => c.id === ct)

  return (
    <div onClick={e => e.stopPropagation()} style={{ position: 'fixed' as const, inset: 0, zIndex: 2000, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>

      {/* ── Sticky header — paddingTop 64px pour dégager la navbar mobile ── */}
      <div style={{ flexShrink: 0, padding: '64px 24px 0', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' as const }}>
        {/* Row 1 : circuit info + chrono + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
              {ctInfo?.icon} {ctInfo?.label ?? 'Séries'}
              {currentCircuit ? ` · ${currentCircuit.label}` : ''}
              {currentStep && currentCircuit && currentCircuit.type !== 'series' && currentCircuit.rounds > 1
                ? ` · Tour ${currentStep.setIdx + 1}/${currentCircuit.rounds}`
                : ''}
            </p>
          </div>
          <span style={{ fontSize: 16, fontFamily: '"DM Mono",monospace', color: 'var(--text-mid)', fontWeight: 700, margin: '0 12px', flexShrink: 0 }}>{fmtTimer(elapsed)}</span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setVibrateEnabled(v => !v)} title={vibrateEnabled ? 'Vibration ON' : 'Vibration OFF'} style={{ background: 'none', border: '1px solid var(--border)', color: vibrateEnabled ? accent : 'var(--text-dim)', fontSize: 14, cursor: 'pointer', padding: '5px 8px', borderRadius: 8, lineHeight: 1 }}>
              {vibrateEnabled ? '📳' : '🔕'}
            </button>
            <button onClick={togglePause} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', padding: '5px 11px', borderRadius: 8 }}>{phase === 'paused' ? '▶' : '⏸'}</button>
            <button onClick={onExit} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', padding: '5px 9px', borderRadius: 8 }}>✕</button>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 99, background: 'var(--border)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct * 100}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)`, borderRadius: 99, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto' as const, padding: '0 24px 36px', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' as const }}>

        {/* ── PAUSE ── */}
        {phase === 'paused' && (
          <div style={{ textAlign: 'center' as const, padding: '60px 0 40px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⏸</div>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne, sans-serif', margin: '0 0 8px' }}>En pause</p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 32px' }}>{fmtTimer(elapsed)} écoulées</p>
            <button onClick={togglePause} style={{ padding: '15px 48px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'Syne, sans-serif', marginBottom: 12 }}>▶ Reprendre</button>
            <br />
            <button onClick={() => { setPhase('done'); setShowConfetti(true); pickMotiv() }} style={{ padding: '11px 28px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
              Terminer la séance
            </button>
          </div>
        )}

        {currentExo && phase !== 'paused' && (
          <>
            {/* ── Phase badge + Nom exo ── */}
            <div style={{ textAlign: 'center' as const, marginBottom: 20, paddingTop: 8 }}>
              <p style={{
                display: 'inline-block', fontSize: 9, fontWeight: 700,
                color: phase === 'rest' ? '#f97316' : accent,
                textTransform: 'uppercase' as const, letterSpacing: '0.14em',
                margin: '0 0 12px',
                padding: '4px 12px', borderRadius: 99,
                background: phase === 'rest' ? 'rgba(249,115,22,0.10)' : `${accent}15`,
                border: `1px solid ${phase === 'rest' ? 'rgba(249,115,22,0.22)' : `${accent}28`}`,
              }}>
                {phase === 'rest' ? '⏱ Repos' : ct === 'emom' ? `⏱ MIN ${currentSetNum}/${currentCircuit?.durationMin ?? 12}` : ct === 'tabata' ? `⚡ ROUND ${currentSetNum}/8` : `SÉRIE ${currentSetNum}/${currentExo.targetSets}`}
              </p>
              <h2 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Syne, sans-serif', margin: '0 0 16px', color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{currentExo.label}</h2>
              {motivMsg && phase === 'work' && (
                <p style={{ fontSize: 11, color: accent, fontStyle: 'italic' as const, margin: '-8px 0 10px', opacity: 0.75 }}>{motivMsg}</p>
              )}
              {phase === 'work' && exoHistory && (() => {
                const key = (currentExo.label ?? '').toLowerCase().trim()
                const hist = exoHistory[key]
                if (!hist) return null
                const dateStr = hist.date ? new Date(hist.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''
                return (
                  <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '-6px 0 10px', fontStyle: 'italic' as const }}>
                    Dernière : {hist.weight}kg × {hist.reps}{dateStr ? ` (${dateStr})` : ''}
                  </p>
                )
              })()}
            </div>

            {/* ── Pastilles séries ── */}
            {phase === 'work' && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' as const }}>
                {Array.from({ length: currentExo.targetSets }).map((_, i) => {
                  const done   = i < currentSetNum - 1
                  const active = i === currentSetNum - 1
                  const set    = currentExo.logSets[i]
                  const nc     = set?.note === 'fail' ? '#ef4444' : set?.note === 'hard' ? '#f97316' : set?.note === 'easy' ? '#22c55e' : undefined
                  return (
                    <div key={i} style={{
                      minWidth: 46, height: 50, borderRadius: 11, padding: '0 7px',
                      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                      background: done ? (nc ?? accent) : active ? `${accent}20` : 'var(--bg-card)',
                      border: `1.5px solid ${done ? (nc ?? accent) : active ? accent : 'var(--border)'}`,
                      color: done ? '#fff' : active ? accent : 'var(--text-dim)',
                      transition: 'all 0.25s',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 800, fontFamily: '"DM Mono",monospace', lineHeight: 1 }}>{i + 1}</span>
                      {done && set && <span style={{ fontSize: 8, opacity: 0.85, marginTop: 2, fontFamily: '"DM Mono",monospace' }}>{set.weight || '—'}×{set.reps}</span>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── REST — grand timer circulaire ── */}
            {phase === 'rest' && (
              <div style={{ textAlign: 'center' as const, marginBottom: 24 }}>
                <div style={{ position: 'relative' as const, width: 180, height: 180, margin: '0 auto 18px' }}>
                  <svg width={180} height={180} viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={90} cy={90} r={72} fill="none" stroke="var(--border)" strokeWidth={10} />
                    <circle cx={90} cy={90} r={72} fill="none" stroke={accent} strokeWidth={10}
                      strokeLinecap="round"
                      strokeDasharray={`${progressArc} ${circumference}`}
                      style={{ transition: 'stroke-dasharray 0.9s linear' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 44, fontWeight: 900, fontFamily: '"DM Mono",monospace', color: accent, lineHeight: 1 }}>{fmtTimer(restRemaining)}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 5, letterSpacing: '0.08em' }}>restant</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' as const }}>
                  {[-30, -10, +10, +30].map(d => (
                    <button key={d} onClick={() => adjustRest(d)} style={{
                      padding: '9px 16px', borderRadius: 9, border: '1px solid var(--border)',
                      background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 12, cursor: 'pointer', fontFamily: '"DM Mono",monospace', fontWeight: 600,
                    }}>{d > 0 ? '+' : ''}{d}s</button>
                  ))}
                </div>
                {/* Aperçu prochain exo */}
                {nextExo && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'left' as const, marginBottom: 14 }}>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }}>
                      Prochain{nextCircuit && nextCircuit !== currentCircuit ? ` · ${nextCircuit.label}` : ''}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                      {nextExo.label}
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontFamily: '"DM Mono",monospace' }}>
                        {nextExo.targetReps} reps{nextExo.targetWeight ? ` @${nextExo.targetWeight}kg` : ''}
                      </span>
                    </p>
                  </div>
                )}
                <button onClick={skipRest} style={{ padding: '10px 26px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  Passer le repos →
                </button>
              </div>
            )}

            {/* ── WORK — saisie + validation ── */}
            {phase === 'work' && (
              <div style={{ marginBottom: 16 }}>
                {/* Charge en grand + Reps */}
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 12 }}>
                  {/* Charge */}
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 7px', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>Charge kg</p>
                    <input
                      value={editWeight}
                      placeholder="—"
                      onChange={e => setEditingSet({ reps: editReps, weight: e.target.value })}
                      style={{
                        width: 100, padding: '12px 10px', borderRadius: 12,
                        border: `2px solid ${accent}55`,
                        background: 'var(--bg-card)', color: accent,
                        fontSize: 36, fontFamily: '"DM Mono",monospace',
                        textAlign: 'center' as const, fontWeight: 900, outline: 'none',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 28, color: 'var(--border)', fontWeight: 300, marginBottom: 10, lineHeight: 1 }}>×</span>
                  {/* Reps */}
                  <div style={{ textAlign: 'center' as const }}>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: '0 0 7px', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>Reps</p>
                    <input
                      type="number" min={0} max={999}
                      value={editReps}
                      onChange={e => setEditingSet({ reps: parseInt(e.target.value) || 0, weight: editWeight })}
                      style={{
                        width: 80, padding: '12px 8px', borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)', color: 'var(--text)',
                        fontSize: 32, fontFamily: '"DM Mono",monospace',
                        textAlign: 'center' as const, fontWeight: 800, outline: 'none',
                      }}
                    />
                  </div>
                </div>


                {/* Bouton principal */}
                <button onClick={() => validateSet('ok')} style={{
                  width: '100%', padding: '19px', borderRadius: 14, border: 'none',
                  background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff',
                  fontSize: 16, fontWeight: 900, cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  letterSpacing: '0.01em', boxShadow: `0 4px 24px ${accent}30`,
                }}>
                  {ct === 'emom' ? `⏱ Valider min ${currentSetNum}` :
                   ct === 'tabata' ? `⚡ Valider round ${currentSetNum}/8` :
                   `✓ Valider série ${currentSetNum}/${currentExo.targetSets}`}
                  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.75, marginLeft: 10 }}>
                    {ct === 'tabata' ? '→ 10s repos' : ct === 'emom' ? '→ 15s repos' : `→ ${fmtTimer(currentExo.restSec)} repos`}
                  </span>
                </button>
              </div>
            )}

            {/* ── Actions secondaires ── */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, marginTop: 16, flexWrap: 'wrap' as const }}>
              <button onClick={skipExo} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>Passer →</button>
              <button onClick={() => setReplaceSearch(currentExo.id)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>⇄ Remplacer</button>
            </div>

            {/* ── Remplacement ── */}
            {replaceSearch === currentExo.id && (
              <div style={{ padding: '14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', marginBottom: 16 }}>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Chercher un exercice..." autoFocus
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' as const }} />
                <div style={{ maxHeight: 160, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                  {EXERCISE_DATABASE.filter(e => {
                    const q = searchQuery.toLowerCase()
                    return !q || e.name.toLowerCase().includes(q) || e.aliases.some(a => a.toLowerCase().includes(q))
                  }).slice(0, 8).map(e => (
                    <button key={e.id} onClick={() => replaceExo(e.name)} style={{
                      width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', textAlign: 'left' as const, fontWeight: 500,
                    }}>
                      {e.name} <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{e.aliases[0] ?? ''}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setReplaceSearch(null); setSearchQuery('') }} style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}>Annuler</button>
              </div>
            )}

            {/* ── Exercice suivant (work phase) ── */}
            {nextExo && phase === 'work' && (
              <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 4px' }}>
                  Suivant{nextCircuit && nextCircuit !== currentCircuit ? ` · ${nextCircuit.label}` : ''}
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', margin: 0 }}>
                  {nextExo.label}
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontFamily: '"DM Mono",monospace' }}>
                    {nextExo.targetReps} reps{nextExo.targetWeight ? ` @${nextExo.targetWeight}kg` : ''}
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────

export function SessionEditor({ mode, session, dayIndex, plan, onClose, onSave, onDelete, onValidate, onAutoSave, onDuplicate, openWithFavorites }: {
  mode: 'create' | 'edit'
  session?: Session
  dayIndex?: number
  plan?: PlanVariant
  onClose: () => void
  onSave: (s: Session) => void
  onDelete?: (id: string) => void
  onValidate?: (s: Session) => void
  onAutoSave?: (s: Session) => void
  onDuplicate?: (dayIndex: number, session: Session) => void
  openWithFavorites?: boolean
}) {
  const isEdit = mode === 'edit'
  const [sport, setSport] = useState<SportType>(session?.sport ?? 'run')
  const [cyclingSub, setCyclingSub] = useState<CyclingSub>('velo')
  const [trainingTypes, setTrainingTypes] = useState<string[]>([])
  const [title, setTitle] = useState(session?.title ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState(session?.time ?? '09:00')
  const [dur, setDur] = useState(session?.durationMin ?? 60)
  const [rpe, setRpe] = useState(session?.rpe ?? 5)
  const [desc, setDesc] = useState(session?.notes ?? '')
  const [selPlan, setSelPlan] = useState<PlanVariant>(session?.planVariant ?? plan ?? 'A')
  const [blocks, setBlocks] = useState<Block[]>(session?.blocks ?? [])
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [builderTab, setBuilderTab] = useState<'manual' | 'ai'>('manual')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  // Parcours AI flow
  type AIFlowStep = 'ask' | 'parcours' | 'free'
  const [aiFlowStep, setAiFlowStep] = useState<AIFlowStep>('ask')
  interface BlockIntervalsCfg {
    blocks: { type: 'effort' | 'recovery'; sec: number; watts: number }[]
    reps: number
  }
  const [climbConfigs, setClimbConfigs] = useState<Array<{
    segIdx: number; selected: boolean; watts: number; hrAvg?: number; estimatedMin: number
    intervals?: BlockIntervalsCfg
  }>>([])
  const [openIntervals, setOpenIntervals] = useState<Record<string, boolean>>({})
  const [efWatts, setEfWatts] = useState(160)
  const [efHr, setEfHr] = useState(0)
  const [totalDuration, setTotalDuration] = useState('')  // format 'h:mm'
  interface SpecificBlock {
    id: string; startKm: number; endKm: number; watts: number
    hrAvg?: number; estimatedMin: number
    intervals?: BlockIntervalsCfg
  }
  const [specificBlocks, setSpecificBlocks] = useState<SpecificBlock[]>([])
  const [bulkWatts, setBulkWatts] = useState(250)
  const [bulkHr, setBulkHr] = useState(0)
  const [drawModeActive, setDrawModeActive] = useState(false)
  const [pendingBlock, setPendingBlock] = useState<{ startKm: number; endKm: number; anchorPct: number } | null>(null)
  const [pendingWatts, setPendingWatts] = useState(250)
  const [pendingHr, setPendingHr] = useState(0)
  const [showDurPicker, setShowDurPicker] = useState(false)
  const [executeMode, setExecuteMode] = useState(false)
  const [tssInfo, setTssInfo] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [nutritionOpen, setNutritionOpen] = useState(false)
  const [nutritionLoading, setNutritionLoading] = useState(false)
  const [showDuplicateMenu, setShowDuplicateMenu] = useState(false)
  const [favorites, setFavorites] = useState<Array<{id:string;name:string;sport:string;training_type?:string;blocks_data:Block[];nutrition_data:NutritionItem[];duration_min:number;rpe:number;notes:string}>>([])
  const [showFavorites, setShowFavorites] = useState(openWithFavorites ?? false)
  const [exoHistory, setExoHistory] = useState<Record<string, { weight: string; reps: number; date: string }>>({})
  const [nutritionItems, setNutritionItems] = useState<NutritionItem[]>((session as unknown as Session & { nutritionItems?: NutritionItem[] })?.nutritionItems ?? [])
  const [nutritionTab, setNutritionTab] = useState<'manual' | 'ai'>('manual')
  const [nutritionAiPrompt, setNutritionAiPrompt] = useState('')
  const [nutritionAiLoading, setNutritionAiLoading] = useState(false)
  const [parcoursFile, setParcoursFile] = useState<File | null>(null)
  const [parcoursData, setParcoursData] = useState<ParcoursData | null>(session?.parcoursData ?? null)
  const [parcoursLoading, setParcoursLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // Circuit info exposé par ExerciseListBuilder — refs synchrones (pas de stale state)
  const gymCircuitsRef = useRef<ExoCircuit[]>([{ id: 'default', name: 'Séries 1', type: 'series', rounds: 3, restBetweenRoundsSec: 90 }])
  const gymCircuitMapRef = useRef<Record<string, string>>({})
  const { zones: trainingZones } = useTrainingZones()
  const [parcoursError, setParcoursError] = useState<string | null>(null)
  const [hoveredKm, setHoveredKm] = useState<number | null>(null)
  const parcoursInputRef = useRef<HTMLInputElement>(null)
  const [athleteData, setAthleteData] = useState<{
    ftp: number | null
    runThresholdPaceSec: number | null
    cssSecPer100m: number | null
    rowThresholdSecPer500m: number | null
    ctl: number | null
    hrMax: number | null
    hrRest: number | null
    lthrRun: number | null
    lthrBike: number | null
    runThresholdPaceStr: string | null
    swimCSSStr: string | null
  } | null>(null)
  const [athleteProducts, setAthleteProducts] = useState<Array<{
    name: string; type: string; glucidesG: number; proteinesG: number; quantity: string
  }>>([])
  const [athleteWeight, setAthleteWeight] = useState<number>(75)
  const [bikeWeight, setBikeWeight] = useState<number>(8)
  const [terrainLoading, setTerrainLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  // Snapshot des valeurs initiales pour détecter les modifs
  const initialSnapshotRef = useRef<string>('')

  /** Piecewise linear W → FC estimation (IF → %LTHR) */
  function wattToFc(watts: number, ftpVal: number, lthrVal: number): number {
    const ifVal = watts / ftpVal
    const pts: [number, number][] = [[0,0.50],[0.55,0.80],[0.75,0.89],[0.87,0.95],[1.05,1.02],[1.50,1.08]]
    for (let i = 1; i < pts.length; i++) {
      const [x0,y0] = pts[i-1]; const [x1,y1] = pts[i]
      if (ifVal <= x1) return Math.round(lthrVal * (y0 + ((ifVal-x0)/(x1-x0))*(y1-y0)))
    }
    return Math.round(lthrVal * 1.10)
  }

  // Réinitialise le flow IA quand un nouveau parcours est chargé
  useEffect(() => {
    if (parcoursData?.segments?.length) {
      if (parcoursData.planningConfig) {
        // Restore saved planning state
        setClimbConfigs(parcoursData.planningConfig.climbConfigs)
        setSpecificBlocks(parcoursData.planningConfig.specificBlocks)
        setEfWatts(parcoursData.planningConfig.efWatts)
        if (parcoursData.planningConfig.efHr) setEfHr(parcoursData.planningConfig.efHr)
        setTotalDuration(parcoursData.planningConfig.totalDuration)
        const _hm = parcoursData.planningConfig.totalDuration.match(/^(\d+):(\d{2})$/)
        if (_hm) setDur(parseInt(_hm[1]) * 60 + parseInt(_hm[2]))
      } else {
        setTotalDuration('')
        setSpecificBlocks([])
        initClimbConfigs()
      }
      setAiFlowStep('parcours')
    } else {
      setTotalDuration('')
      setSpecificBlocks([])
      setClimbConfigs([])
      setAiFlowStep('ask')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcoursData?.name])

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Initialise le snapshot à l'ouverture (après le premier rendu)
  useEffect(() => {
    initialSnapshotRef.current = JSON.stringify({ sport, title, desc, dur, rpe, blocks, nutritionItems })
    setIsDirty(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Détecte les modifications par rapport au snapshot initial
  useEffect(() => {
    if (!initialSnapshotRef.current) return
    const current = JSON.stringify({ sport, title, desc, dur, rpe, blocks, nutritionItems })
    setIsDirty(current !== initialSnapshotRef.current)
  }, [sport, title, desc, dur, rpe, blocks, nutritionItems])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user || cancelled) return

        const [perfRes, actsRes, profileRes, zonesRes] = await Promise.all([
          // athlete_performance_profile — vraies colonnes vérifiées
          sb.from('athlete_performance_profile')
            .select('ftp_watts,hr_max,hr_rest,lthr_run,lthr_bike,threshold_pace_s_km,css_s_100m,rowing_threshold_pace_s_500m')
            .eq('user_id', user.id).maybeSingle().then(r => r, () => ({ data: null })),
          sb.from('activities').select('tss,started_at,moving_time_s,average_heartrate').eq('user_id', user.id).gte('started_at', new Date(Date.now() - 56 * 86400000).toISOString()).order('started_at', { ascending: true }).then(r => r, () => ({ data: [] })),
          sb.from('profiles').select('weight_kg,bike_weight_kg').eq('id', user.id).maybeSingle().then(r => r, () => ({ data: null })),
          // training_zones bike — source canonique du FTP cyclisme
          sb.from('training_zones').select('ftp_watts').eq('user_id', user.id).eq('sport', 'bike').eq('is_current', true).maybeSingle().then(r => r, () => ({ data: null })),
        ])

        const perf = (perfRes as { data: Record<string, unknown> | null }).data
        const acts = (actsRes as { data: Array<Record<string, unknown>> | null }).data ?? []
        const prof = (profileRes as { data: Record<string, unknown> | null }).data
        const zonesData = (zonesRes as { data: Record<string, unknown> | null }).data
        if (!cancelled) {
          if (prof?.weight_kg) setAthleteWeight(prof.weight_kg as number)
          if (prof?.bike_weight_kg) setBikeWeight(prof.bike_weight_kg as number)
        }

        const ftp = (zonesData?.ftp_watts as number) ?? (perf?.ftp_watts as number) ?? null
        const hrMax = (perf?.hr_max as number) ?? null
        const hrRest = (perf?.hr_rest as number) ?? null
        const lthrRun = (perf?.lthr_run as number) ?? null
        const lthrBike = (perf?.lthr_bike as number) ?? null

        // threshold_pace_s_km : entier (secondes/km)
        const thresholdPaceSecKm = (perf?.threshold_pace_s_km as number) ?? null
        const runThresholdPaceSec = thresholdPaceSecKm
        const runThresholdPaceStr = thresholdPaceSecKm != null
          ? `${Math.floor(thresholdPaceSecKm / 60)}:${String(thresholdPaceSecKm % 60).padStart(2, '0')}`
          : null

        // css_s_100m : entier (secondes/100m)
        const cssSecPer100m = (perf?.css_s_100m as number) ?? null
        const swimCSSStr = cssSecPer100m != null
          ? `${Math.floor(cssSecPer100m / 60)}:${String(cssSecPer100m % 60).padStart(2, '0')}`
          : null

        const rowSecPer500m = (perf?.rowing_threshold_pace_s_500m as number) ?? null

        // CTL: EWMA over 56 days
        const since56d = new Date(Date.now() - 56 * 86400000)
        const tssPerDay: number[] = []
        for (let d = 0; d < 56; d++) {
          const dayStart = new Date(since56d.getTime() + d * 86400000); dayStart.setHours(0,0,0,0)
          const dayEnd = new Date(dayStart); dayEnd.setHours(23,59,59,999)
          tssPerDay.push(acts.filter(a => {
            const t = new Date(a.started_at as string).getTime()
            return t >= dayStart.getTime() && t <= dayEnd.getTime()
          }).reduce((s, a) => {
            if (a.tss && (a.tss as number) > 0) return s + (a.tss as number)
            const h = ((a.moving_time_s as number) ?? 0) / 3600
            if (h <= 0) return s
            const hr = a.average_heartrate as number | null
            if (hr && hr > 0) return s + Math.round(h * (hr / 180) * (hr / 180) * 100)
            return s + Math.round(h * 65)
          }, 0))
        }
        let ctl = 0
        for (const t of tssPerDay) ctl = ctl + (t - ctl) / 42

        if (!cancelled) {
          console.log('[DEBUG] athleteData loaded — ftp=', ftp, 'sport=', sport)
          setAthleteData({
            ftp, runThresholdPaceSec, cssSecPer100m,
            rowThresholdSecPer500m: rowSecPer500m,
            ctl: Math.round(ctl),
            hrMax, hrRest, lthrRun, lthrBike,
            runThresholdPaceStr, swimCSSStr,
          })
        }
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Auto-charger le parcours depuis Supabase si la séance a un parcours_id
  useEffect(() => {
    const pid = session?.parcoursId
    if (!pid || parcoursData) return
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data, error } = await sb
          .from('parcours')
          .select('id, name, total_km, elevation_gain_m, elevation_loss_m, elevation_profile, segments')
          .eq('id', pid)
          .single()
        if (error || !data) {
          console.warn('[auto-load parcours] not found or error:', error?.message)
          return
        }
        const ep = (data.elevation_profile ?? []) as Array<{ distKm: number; ele: number }>
        setParcoursData({
          name:             data.name,
          distance:         (data.total_km as number) ?? null,
          elevation:        (data.elevation_gain_m as number) ?? null,
          points:           ep.length,
          elevationProfile: ep,
          segments:         ((data.segments ?? []) as import('@/lib/gpx/parser').ParsedSegment[]),
          parcoursId:       data.id,
        })
      } catch (e) {
        console.error('[auto-load parcours]', e)
      }
    })()
  }, [session?.parcoursId])

  useEffect(() => {
    if (mode !== 'create') return
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('session_favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        setFavorites(data ?? [])
      } catch {}
    })()
  }, [mode])

  useEffect(() => {
    const isStrengthSport = sport === 'gym' || sport === 'hyrox'
    if (!isStrengthSport) return
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('planned_sessions')
          .select('blocks,started_at')
          .eq('user_id', user.id)
          .in('sport', ['gym', 'hyrox'])
          .not('blocks', 'is', null)
          .order('started_at', { ascending: false })
          .limit(20)
        if (!data) return
        const history: Record<string, { weight: string; reps: number; date: string }> = {}
        for (const sess of data) {
          const blks = (sess.blocks ?? []) as Block[]
          for (const b of blks) {
            if (b.type === 'circuit_header') continue
            const key = (b.label ?? '').toLowerCase().trim()
            if (key && !history[key] && b.value) {
              history[key] = { weight: b.value, reps: b.reps ?? 0, date: (sess as Record<string,unknown>).started_at as string ?? '' }
            }
          }
        }
        setExoHistory(history)
      } catch {}
    })()
  }, [sport])

  // Charger les produits nutrition de l'athlète
  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('nutrition_products').select('name,type,glucidesG:glucides_g,proteinesG:proteines_g,quantity').eq('user_id', user.id).then(r => r, () => ({ data: null }))
        if (data && Array.isArray(data)) setAthleteProducts(data as typeof athleteProducts)
      } catch {}
    })()
  }, [])

  // ── Auto-save (edit mode) ─────────────────────────────────────────
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (mode !== 'edit' || !onAutoSave || !session?.id) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      const isStrengthSport = sport === 'gym' || sport === 'hyrox'
      // Utiliser exercisesToBlocks pour inclure les circuit_headers avec le bon mode
      const autoBlocks = isStrengthSport && exercises.length > 0
        ? exercisesToBlocks(exercises, gymCircuitsRef.current, gymCircuitMapRef.current)
        : blocks
      if (autoBlocks.length === 0) return
      onAutoSave({ ...session, sport, title, time, durationMin: dur, rpe, blocks: autoBlocks, notes: desc || undefined })
    }, 800)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, exercises])

  // Thème neutre/classique — identique pour tous les sports (plus d'accent par sport).
  // Les logos gardent leur couleur propre ; seul le thème UI est uniforme.
  const accent = '#06B6D4'
  const isStrength = sport === 'gym' || sport === 'hyrox'
  const trainTypes = TRAINING_TYPES[sport] ?? []

  // ── Zones FC : modèle LTHR identique à la page Zones ─────────────
  // Priorité : lthr_run/lthr_bike → hrMax*0.85 (estimation LTHR) → fallback hardcodé
  const lthrForSport = (() => {
    if (!athleteData) return null
    const lthr = sport === 'bike' ? athleteData.lthrBike : athleteData.lthrRun
    if (lthr) return lthr
    if (athleteData.hrMax) return Math.round(athleteData.hrMax * 0.85)
    return null
  })()
  const fcZones: number[] = lthrForSport
    ? [
        Math.round(lthrForSport * 0.80),   // Z1/Z2
        Math.round(lthrForSport * 0.89),   // Z2/Z3
        Math.round(lthrForSport * 0.95),   // Z3/Z4
        Math.round(lthrForSport * 1.02),   // Z4/Z5
      ]
    : []

  // ── Source unique TSS + zones (computeSessionStats) ──────────────
  const sessionStats = computeSessionStats(blocks, sport, dur, rpe, athleteData)
  const sessionAvg = computeSessionAverages(blocks, sport)
  const tssDisplay = sessionStats.tssLow === 0 && sessionStats.tssHigh === 0
    ? '—'
    : sessionStats.tssLow === sessionStats.tssHigh
      ? String(sessionStats.tssLow)
      : `${sessionStats.tssLow}–${sessionStats.tssHigh}`
  const tssLabel = sessionStats.tssHigh < 50 ? 'Très facile' : sessionStats.tssHigh < 100 ? 'Modérée' : sessionStats.tssHigh < 150 ? 'Difficile' : sessionStats.tssHigh < 200 ? 'Très difficile' : 'Extrême'
  const smsn = estimateSmSn(blocks, dur)

  // RPE color
  const rpeCol = rpe <= 3 ? '#4ade80' : rpe <= 6 ? '#facc15' : rpe <= 8 ? '#fb923c' : '#f87171'

  // Donut derived values — zones from computeSessionStats (source unique)
  const showDonuts = ['run', 'bike', 'swim', 'rowing'].includes(sport) && blocks.length > 0
  // 7-zone colors for donuts (design system colors)
  const DONUT_ZONE_COLORS = ['#9CA3AF', '#10B981', '#FBBF24', '#F97316', '#EF4444', '#8B5CF6', '#1D4ED8']
  const DONUT_ZONE_LABELS = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7']
  const zoneDist = sessionStats.zoneDist  // 7-element array, always
  const hrDist = computeHRDistribution(blocks, fcZones.length > 0 ? fcZones : undefined)

  // Duration gauge is set only by user input — do not auto-compute from blocks

  // Auto-save intentionally removed — save on close instead to avoid infinite re-render loop

  function handleExportPDF() {
    const finalTitle = title || `${SPORT_LABEL[sport]} ${trainingTypes.join('+')}`
    const blocksHtml = blocks.map(b => {
      const durStr = b.mode === 'interval' && b.reps && b.effortMin && b.recoveryMin
        ? `${b.reps} × ${b.effortMin}min + ${b.recoveryMin}min récup`
        : `${b.durationMin}min`
      const zoneCol = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444'][b.zone - 1] ?? '#9ca3af'
      return `<tr><td style="color:${zoneCol};font-weight:700">Z${b.zone}</td><td>${b.label}</td><td>${durStr}</td><td>${b.value || '—'}</td></tr>`
    }).join('')
    const nutritionHtml = nutritionItems.length > 0
      ? `<h3 style="font-size:14px;margin-top:28px;border-top:1px solid #eee;padding-top:16px">Stratégie nutritionnelle</h3><table><tr><th>Temps</th><th>Aliment</th><th>Quantité</th><th>Glucides</th><th>Protéines</th></tr>${[...nutritionItems].sort((a,b) => a.timeMin - b.timeMin).map(m => `<tr><td>${m.timeMin === 0 ? 'Avant départ' : m.timeMin + 'min'}</td><td>${m.name || m.type}</td><td>${m.quantity}</td><td>${m.glucidesG}g</td><td>${m.proteinesG}g</td></tr>`).join('')}<tr style="background:#f9f9f9;font-weight:600"><td colspan="3">Total</td><td>${nutritionItems.reduce((s,x)=>s+x.glucidesG,0)}g glucides</td><td>${nutritionItems.reduce((s,x)=>s+x.proteinesG,0)}g prot.</td></tr></table>`
      : ''
    const parcoursSection = (() => {
      if (!parcoursData) return ''
      const profile = parcoursData.elevationProfile
      const totalKm = parcoursData.distance ?? (profile.length > 0 ? profile[profile.length - 1].distKm : 0)

      // SVG Trace GPS
      const traceSection = (() => {
        const trace = parcoursData.gpsTrace
        if (!trace || trace.length < 2) return ''
        const lats = trace.map(p => p.lat), lons = trace.map(p => p.lon)
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const minLon = Math.min(...lons), maxLon = Math.max(...lons)
        const latRange = maxLat - minLat || 0.01, lonRange = maxLon - minLon || 0.01
        const W = 500, H = 280
        const aspect = lonRange / latRange
        let plotW = W, plotH = H
        if (aspect > W / H) plotH = W / aspect; else plotW = H * aspect
        const padX = (W - plotW) / 2, padY = (H - plotH) / 2
        const svgPts = trace.map(p => ({
          x: padX + ((p.lon - minLon) / lonRange) * plotW,
          y: padY + (1 - (p.lat - minLat) / latRange) * plotH,
        }))
        const pathD = svgPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
        const sx = svgPts[0].x, sy = svgPts[0].y
        const ex = svgPts[svgPts.length - 1].x, ey = svgPts[svgPts.length - 1].y
        return `<h4 style="font-size:12px;font-weight:600;margin:10px 0 6px;color:#555">Trace GPS</h4>
<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;margin:4px 0 12px;background:#f8f9fa;border-radius:8px;border:1px solid #e5e7eb">
  <path d="${pathD}" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linejoin="round" opacity="0.8"/>
  <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="5" fill="#22c55e" stroke="#fff" stroke-width="2"/>
  <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="#ef4444" stroke="#fff" stroke-width="2"/>
  <text x="${(sx + 8).toFixed(1)}" y="${(sy + 4).toFixed(1)}" font-size="9" fill="#22c55e" font-weight="700">Départ</text>
  <text x="${(ex + 8).toFixed(1)}" y="${(ey + 4).toFixed(1)}" font-size="9" fill="#ef4444" font-weight="700">Arrivée</text>
</svg>`
      })()

      const header = `<h3 style="font-size:13px;font-weight:700;margin:24px 0 6px;color:#333">Parcours — ${parcoursData.name}</h3>
<div style="display:flex;gap:16px;font-size:11px;color:#666;margin-bottom:8px">${parcoursData.distance != null ? `<span><strong style="color:#333">${parcoursData.distance}</strong> km</span>` : ''}${parcoursData.elevation != null ? `<span><strong style="color:#333">${parcoursData.elevation}</strong> m D+</span>` : ''}</div>${traceSection}`

      if (profile.length < 2 || totalKm === 0) return header

      const minEle = Math.min(...profile.map(p => p.ele))
      const maxEle = Math.max(...profile.map(p => p.ele))
      const eleRange = maxEle - minEle || 1
      const W = 600, H = 120, PL = 36, PR = 10, PT = 10, PB = 20
      const pW = W - PL - PR, pH = H - PT - PB
      const pts = profile.map(p => ({ x: PL + (p.distKm / totalKm) * pW, y: PT + pH - ((p.ele - minEle) / eleRange) * pH }))
      const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      const fillD = `${pathD} L${pts[pts.length-1].x.toFixed(1)},${PT+pH} L${PL},${PT+pH} Z`
      const yStep = eleRange > 500 ? 200 : eleRange > 200 ? 100 : 50
      const yTicks: number[] = []
      for (let e = Math.ceil(minEle / yStep) * yStep; e <= maxEle; e += yStep) yTicks.push(e)
      const xStep = totalKm > 150 ? 20 : totalKm > 80 ? 10 : totalKm > 30 ? 5 : 2
      const xTicks: number[] = []
      for (let km = 0; km <= totalKm; km += xStep) xTicks.push(km)
      return `${header}<h4 style="font-size:12px;font-weight:600;margin:10px 0 6px;color:#555">Profil altimétrique</h4>
<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;margin:4px 0 8px">
${yTicks.map(ele => { const y = PT+pH-((ele-minEle)/eleRange)*pH; return `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W-PR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/><text x="${PL-4}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7" fill="#999" font-family="monospace">${ele}m</text>` }).join('\n')}
${xTicks.map(km => { const x = PL+(km/totalKm)*pW; return `<line x1="${x.toFixed(1)}" y1="${PT}" x2="${x.toFixed(1)}" y2="${PT+pH}" stroke="#e5e7eb" stroke-width="0.5" opacity="0.4"/><text x="${x.toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="7" fill="#999" font-family="monospace">${km}km</text>` }).join('\n')}
<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT+pH}" stroke="#d1d5db" stroke-width="0.6"/>
<line x1="${PL}" y1="${PT+pH}" x2="${W-PR}" y2="${PT+pH}" stroke="#d1d5db" stroke-width="0.6"/>
<path d="${fillD}" fill="${accent}" opacity="0.06"/>
<path d="${pathD}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.7" stroke-linejoin="round"/>
<text x="${PL+4}" y="${PT+pH-4}" font-size="7" fill="#999" font-family="monospace">${Math.round(minEle)}m</text>
<text x="${W-PR-4}" y="${PT+8}" text-anchor="end" font-size="7" fill="${accent}" font-weight="600" font-family="monospace">${Math.round(maxEle)}m</text>
</svg>`
    })()
    const html = `<!DOCTYPE html><html><head><title>${finalTitle}</title><meta charset="utf-8"><style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;max-width:800px;margin:0 auto;color:#111;background:#fff}h1{font-size:24px;font-weight:800;margin:0 0 4px;letter-spacing:-0.03em}h3{font-size:14px;font-weight:700;margin:0 0 10px;color:#333}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}td,th{padding:7px 10px;border:1px solid #e5e7eb;text-align:left}th{background:#f9fafb;font-weight:600;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:0.04em}.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #f3f4f6}.sport-badge{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;background:#f3f4f6;color:#555;letter-spacing:0.06em}.metrics{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap}.metric{text-align:center}.metric-val{font-size:20px;font-weight:800;color:#111;font-variant-numeric:tabular-nums}.metric-lbl{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px}@media print{body{padding:16px}}</style></head><body><div class="header"><div><h1>${finalTitle}</h1><p style="font-size:13px;color:#999;margin:4px 0 0">${SPORT_LABEL[sport]}</p></div><span class="sport-badge">${SPORT_ABBR[sport]}</span></div><div class="metrics"><div class="metric"><div class="metric-val">${fmtDurLocal(dur)}</div><div class="metric-lbl">Durée</div></div><div class="metric"><div class="metric-val">${tssDisplay}</div><div class="metric-lbl">TSS</div></div><div class="metric"><div class="metric-val">${rpe}/10</div><div class="metric-lbl">RPE</div></div>${parcoursData?.distance != null ? `<div class="metric"><div class="metric-val">${parcoursData.distance} km</div><div class="metric-lbl">Distance</div></div>` : ''}${parcoursData?.elevation != null ? `<div class="metric"><div class="metric-val">${parcoursData.elevation} m</div><div class="metric-lbl">Dénivelé +</div></div>` : ''}</div>${desc ? `<p style="font-size:12px;color:#555;line-height:1.6;background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:24px">${desc}</p>` : ''}${blocks.length > 0 ? `<h3>Blocs d'intensité</h3><table><tr><th>Zone</th><th>Bloc</th><th>Durée</th><th>Cible</th></tr>${blocksHtml}</table>` : ''}${nutritionHtml}${parcoursSection}<p style="margin-top:40px;font-size:10px;color:#bbb;border-top:1px solid #f3f4f6;padding-top:16px">THW Coaching · Généré le ${new Date().toLocaleDateString('fr-FR')}</p></body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400) }
  }

  function handleSportChange(s: SportType) {
    setSport(s); setTrainingTypes([]); setBlocks([]); setExercises([])
  }

  // Convertit les circuits + exercices du ExerciseListBuilder en Block[] avec circuit_headers
  function exercisesToBlocks(exos: ExerciseItem[], circuits: ExoCircuit[], map: Record<string, string>): Block[] {
    const result: Block[] = []
    for (const circuit of circuits) {
      const circuitExos = exos.filter(e => (map[e.id] ?? 'default') === circuit.id)
      if (circuitExos.length === 0) continue
      result.push({
        id: circuit.id,
        mode: circuit.type as BlockMode,   // 'series' | 'circuit' | 'superset' | 'emom' | 'tabata'
        type: 'circuit_header' as BlockType,
        durationMin: circuit.targetTimeSec ? Math.ceil(circuit.targetTimeSec / 60) : 0,
        zone: circuit.rounds,
        value: '',
        hrAvg: '',
        label: circuit.name,
        recoveryMin: circuit.restBetweenRoundsSec / 60,  // repos entre tours
      })
      for (const e of circuitExos) {
        result.push({
          id: e.id,
          mode: 'single' as BlockMode,
          type: 'effort' as BlockType,
          durationMin: e.targetTimeSec ? Math.ceil(e.targetTimeSec / 60) : Math.ceil((e.sets * (e.restSec + 60)) / 60),
          zone: e.sets,
          value: e.weightKg ? String(e.weightKg) : '',
          hrAvg: e.kcal ? String(e.kcal) : '',
          label: [e.name, `${e.sets}×${e.reps}`, e.weightKg ? `@${e.weightKg}kg` : '', e.distanceM ? `${e.distanceM}m` : '', e.notes ? `— ${e.notes}` : ''].filter(Boolean).join(' ').trim(),
          reps: e.reps,
          recoveryMin: e.restSec / 60,
          effortMin: e.targetTimeSec ? e.targetTimeSec / 60 : 0,
        })
      }
    }
    return result
  }

  function handleSubmit() {
    const ttStr = trainingTypes.join('+')
    const finalTitle = title || (ttStr ? `${SPORT_LABEL[sport]} ${ttStr}` : SPORT_LABEL[sport])
    const subLabel = sport === 'bike' ? ` — ${CYCLING_SUB_LABEL[cyclingSub]}` : ''
    const parcoursMin = parseDurationToMin(totalDuration)
    const finalDur = aiFlowStep === 'parcours' && parcoursMin > 0 ? parcoursMin : dur || 60
    const parcoursFlowTss = computeParcoursFlowTSS()
    const finalTss = (aiFlowStep === 'parcours' && parcoursFlowTss ? parcoursFlowTss.tss : sessionStats.tssHigh) || undefined
    const finalBlocks = isStrength && exercises.length > 0
      ? exercisesToBlocks(exercises, gymCircuitsRef.current, gymCircuitMapRef.current)
      : aiFlowStep === 'parcours' && parcoursData
        ? buildParcoursBlocks()
        : blocks
    const savedSession: Session = {
      ...(session ?? {}),
      id: session?.id ?? '',
      dayIndex: dayIndex ?? session?.dayIndex ?? 0,
      sport, title: finalTitle + subLabel, time,
      durationMin: finalDur, tss: finalTss,
      status: session?.status ?? 'planned', notes: desc || undefined,
      blocks: finalBlocks, rpe, planVariant: selPlan,
      parcoursData: parcoursDataWithConfig() ?? undefined,
      parcoursId: parcoursData?.parcoursId ?? undefined,
      nutritionItems: nutritionItems.length > 0 ? nutritionItems : undefined,
    }
    onSave(savedSession)
    onClose()
  }

  async function generateBlocksFromTerrain() {
    if (!parcoursData || !athleteData?.ftp) return
    setTerrainLoading(true)
    try {
      const segs = analyzeTerrainSegments(
        parcoursData.elevationProfile,
        athleteData.ftp,
        athleteWeight,
        bikeWeight,
      )
      // Build Block[] from terrain segments
      const newBlocks: Block[] = segs.map((seg, i) => {
        const targetWatts = seg.type === 'climb'
          ? Math.round(athleteData.ftp! * 0.9)
          : seg.type === 'descent'
            ? Math.round(athleteData.ftp! * 0.5)
            : Math.round(athleteData.ftp! * 0.75)
        const zone = seg.type === 'climb' ? 4 : seg.type === 'descent' ? 1 : 3
        // Exact time (float) for ±5% range display
        const timeMinExact = estimateTimeOnSegment(seg.distanceKm, seg.avgGradient, targetWatts, athleteWeight, bikeWeight)
        const durationMin = Math.max(1, Math.round(timeMinExact))
        const lo = fmtDuration(timeMinExact * 0.95)
        const hi = fmtDuration(timeMinExact * 1.05)
        const typeName = seg.type === 'climb' ? 'Montée' : seg.type === 'descent' ? 'Descente' : 'Plat'
        const gradStr = Math.abs(seg.avgGradient) >= 0.5 ? ` ${Math.abs(seg.avgGradient).toFixed(1)}%` : ''
        const label = `${typeName}${gradStr} — ${lo} à ${hi}`
        return {
          id: `terrain_${i}`,
          mode: 'effort' as BlockMode,
          type: 'effort' as BlockType,
          durationMin,
          zone,
          value: String(targetWatts),  // just the number — convention throughout the app
          hrAvg: '',
          label,
          _startKm: seg.startKm,
          _endKm: seg.endKm,
        }
      })
      setBlocks(newBlocks)
      // Update total duration
      const totalMin = newBlocks.reduce((s, b) => s + b.durationMin, 0)
      setDur(totalMin)
      setBuilderTab('manual')
    } catch (e) {
      console.error('[Terrain]', e)
    } finally {
      setTerrainLoading(false)
    }
  }

  // ── Parcours AI flow helpers ──────────────────────────────────
  function parcoursDataWithConfig(): ParcoursData | null {
    if (!parcoursData) return null
    if (aiFlowStep !== 'parcours') return parcoursData
    return { ...parcoursData, planningConfig: { climbConfigs, specificBlocks, efWatts, efHr, totalDuration } }
  }

  function initClimbConfigs() {
    const ftp = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 200
    const lthrVal = athleteData?.lthrBike ?? athleteData?.lthrRun ?? 170
    const segs = parcoursData?.segments ?? []
    const configs = segs
      .map((seg, idx) => ({ seg, idx }))
      .filter(({ seg }) => seg.type === 'climb')
      .map(({ seg, idx }) => {
        // Deux itérations pour converger watts ↔ durée
        let watts = ftp * 0.85
        for (let iter = 0; iter < 2; iter++) {
          const mins = estimateTimeOnSegment(seg.distanceKm, seg.avgGradient, watts, athleteWeight, bikeWeight)
          watts = mins < 8 ? ftp * 1.00 : mins < 20 ? ftp * 0.90 : ftp * 0.80
        }
        watts = Math.round(watts)
        const estimatedMin = estimateTimeOnSegment(seg.distanceKm, seg.avgGradient, watts, athleteWeight, bikeWeight)
        const hrAvg = wattToFc(watts, ftp, lthrVal)
        return { segIdx: idx, selected: true, watts, hrAvg, estimatedMin }
      })
    setClimbConfigs(configs)
    const initEfW = Math.round(ftp * 0.65)
    setEfWatts(initEfW)
    setEfHr(wattToFc(initEfW, ftp, lthrVal))
  }

  /** Parse "h:mm" ou "mm" → minutes */
  function parseDurationToMin(str: string): number {
    const hm = str.match(/^(\d+):(\d{2})$/)
    if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2])
    const n = parseInt(str)
    return isNaN(n) ? 0 : n
  }

  /** NP-based TSS. Retourne null si FTP absent ou durée non saisie. */
  function computeParcoursFlowTSS(): { tss: number; np: number; ifVal: number } | null {
    const ftp = athleteData?.ftp
    if (!ftp || ftp <= 0) return null
    const segs = parcoursData?.segments ?? []
    const totalMin = parseDurationToMin(totalDuration)
    if (totalMin <= 0) return null
    const total_s = totalMin * 60   // secondes

    // Segments pondérés watts × durée_s
    const weighted: Array<{ watts: number; dur_s: number }> = []

    // Montées (specific block override si chevauchement)
    for (const c of climbConfigs) {
      const seg = segs[c.segIdx]
      if (!seg) continue
      const override = specificBlocks.find(sb =>
        sb.startKm < seg.endKm && sb.endKm > seg.startKm
      )
      const w     = override ? override.watts : c.selected ? c.watts : efWatts
      const dur_s = (override ? override.estimatedMin : c.estimatedMin) * 60  // min → s
      weighted.push({ watts: w, dur_s })
    }

    // Blocs spécifiques hors montées
    for (const sb of specificBlocks) {
      const overlapsClimb = climbConfigs.some(c => {
        const seg = segs[c.segIdx]
        return seg && sb.startKm < seg.endKm && sb.endKm > seg.startKm
      })
      if (!overlapsClimb) weighted.push({ watts: sb.watts, dur_s: sb.estimatedMin * 60 })
    }

    // Temps restant à efWatts (total - somme des segments déjà alloués)
    const allocatedS = weighted.reduce((s, x) => s + x.dur_s, 0)
    const remainingS = Math.max(0, total_s - allocatedS)
    if (remainingS > 0) weighted.push({ watts: efWatts, dur_s: remainingS })

    // NP = (Σ w⁴·dur_s / Σ dur_s)^(1/4)
    const totalDurS = weighted.reduce((s, x) => s + x.dur_s, 0)
    if (totalDurS <= 0) return null
    const sum_w4 = weighted.reduce((s, x) => s + Math.pow(x.watts, 4) * x.dur_s, 0)
    const NP    = Math.pow(sum_w4 / totalDurS, 0.25)
    const IF    = NP / ftp
    // TSS = (durée_s × NP × IF) / (FTP × 3600) × 100
    const TSS   = (total_s * NP * IF) / (ftp * 3600) * 100
    return { tss: Math.round(TSS), np: Math.round(NP), ifVal: Math.round(IF * 100) / 100 }
  }

  function buildParcoursBlocks(): Block[] {
    if (!parcoursData?.segments) return blocks
    const ftp = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 200
    const segs = parcoursData.segments
    const routeKm = parcoursData.distance ?? (parcoursData.elevationProfile.length > 0 ? parcoursData.elevationProfile[parcoursData.elevationProfile.length - 1].distKm : 0)
    const result: Block[] = []
    let bIdx = 0
    const zn = (w: number) => {
      const r = w / ftp
      return r > 1.50 ? 7 : r > 1.20 ? 6 : r > 1.05 ? 5 : r > 0.87 ? 4 : r > 0.75 ? 3 : r > 0.55 ? 2 : 1
    }
    const push = (label: string, watts: number, distKm: number, grad: number) => {
      const mins = estimateTimeOnSegment(distKm, grad, watts, athleteWeight, bikeWeight)
      result.push({ id: `parcours_${bIdx++}`, mode: 'effort' as BlockMode, type: 'effort' as BlockType, durationMin: Math.max(1, Math.round(mins)), zone: zn(watts), value: String(watts), hrAvg: '', label })
    }

    const selectedClimbs = climbConfigs.filter(c => c.selected).sort((a, b) => segs[a.segIdx].startKm - segs[b.segIdx].startKm)

    // Build ordered timeline: EF gaps + climbs, then cut out specificBlock ranges
    type Range = { startKm: number; endKm: number; watts: number; grad: number; label: string }
    let timeline: Range[] = []

    const pushEF = (s: number, e: number) => {
      if (e - s < 0.05) return
      const distKm = e - s
      const sp = parcoursData.elevationProfile.find(p => p.distKm >= s)
      const ep = parcoursData.elevationProfile.find(p => p.distKm >= e)
      const grad = sp && ep && distKm > 0 ? ((ep.ele - sp.ele) / (distKm * 1000)) * 100 : 0
      timeline.push({ startKm: s, endKm: e, watts: efWatts, grad, label: `EF km${Math.round(s * 10) / 10}→${Math.round(e * 10) / 10}` })
    }

    if (selectedClimbs.length === 0) {
      pushEF(0, routeKm)
    } else {
      pushEF(0, segs[selectedClimbs[0].segIdx].startKm)
      for (let i = 0; i < selectedClimbs.length; i++) {
        const cc = selectedClimbs[i]
        const seg = segs[cc.segIdx]
        timeline.push({ startKm: seg.startKm, endKm: seg.endKm, watts: cc.watts, grad: seg.avgGradient, label: `Côte ${i + 1} km${seg.startKm}→${seg.endKm}` })
        const nextStart = i < selectedClimbs.length - 1 ? segs[selectedClimbs[i + 1].segIdx].startKm : routeKm
        pushEF(seg.endKm, nextStart)
      }
    }

    // Subtract specificBlock ranges from timeline, then add specific blocks in order
    for (const sb of specificBlocks) {
      timeline = timeline.flatMap(r => {
        if (r.endKm <= sb.startKm || r.startKm >= sb.endKm) return [r]
        const parts: Range[] = []
        if (r.startKm < sb.startKm) parts.push({ ...r, endKm: sb.startKm })
        if (r.endKm > sb.endKm)     parts.push({ ...r, startKm: sb.endKm })
        return parts
      })
    }
    const sortedSb = [...specificBlocks].sort((a, b) => a.startKm - b.startKm)
    for (const sb of sortedSb) {
      const dist = Math.max(0.1, sb.endKm - sb.startKm)
      const sp = parcoursData.elevationProfile.find(p => p.distKm >= sb.startKm)
      const ep = parcoursData.elevationProfile.find(p => p.distKm >= sb.endKm)
      const grad = sp && ep && dist > 0 ? ((ep.ele - sp.ele) / (dist * 1000)) * 100 : 0
      timeline.push({ startKm: sb.startKm, endKm: sb.endKm, watts: sb.watts, grad, label: `Bloc spécifique km${sb.startKm}→${sb.endKm}` })
    }

    // Sort by startKm and emit Block objects
    timeline.sort((a, b) => a.startKm - b.startKm)
    for (const r of timeline) push(r.label, r.watts, r.endKm - r.startKm, r.grad)
    return result
  }

  function handleAIGenerateFromParcours() {
    const ftp = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 200
    const segs = parcoursData?.segments ?? []

    const selectedLines = climbConfigs
      .filter(c => c.selected)
      .map((c, i) => {
        const seg = segs[c.segIdx]
        if (!seg) return ''
        return `- Côte ${i + 1} : km${seg.startKm}→km${seg.endKm} | ${seg.distanceKm}km à ${seg.avgGradient}% | D+${seg.elevationDeltaM}m | cible ${c.watts}W (~${c.estimatedMin.toFixed(0)}min)`
      }).filter(Boolean).join('\n')

    const totalMin = parseDurationToMin(totalDuration)
    const durationLine = totalMin > 0
      ? `\nDurée totale prévue : ${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, '0')} (${totalMin} min)`
      : ''

    const specificLines = specificBlocks.length > 0
      ? '\nBlocs spécifiques :\n' + specificBlocks.map((sb, i) =>
        `- Bloc ${i + 1} : km${sb.startKm}→km${sb.endKm} | cible ${sb.watts}W${sb.hrAvg ? ` | FC ~${sb.hrAvg}bpm` : ''} (~${sb.estimatedMin.toFixed(0)}min)`
      ).join('\n')
      : ''

    const prompt = [
      `Génère une séance cyclisme sur ce parcours.`,
      parcoursData?.name ? `Parcours : ${parcoursData.name}${parcoursData.distance ? ` (${parcoursData.distance} km)` : ''}` : '',
      durationLine,
      `\nIntensité de fond (plats et descentes) : ${efWatts}W (IF ${(efWatts / ftp).toFixed(2)})`,
      selectedLines ? `\nMontées à travailler :\n${selectedLines}` : '\nPas de montée sélectionnée — génère une séance en endurance de fond.',
      specificLines,
      `\nGénère les blocs du parcours dans l'ordre géographique : côtes à l'intensité cible, plats/descentes à ${efWatts}W. NE PAS ajouter d'échauffement ni de retour au calme — l'utilisateur les ajoute manuellement.`,
      `Respecte les durées estimées pour les côtes. Pour les plats/descentes, calcule la durée depuis la distance restante${totalMin > 0 ? ' et la durée totale indiquée' : ''}.`,
    ].filter(Boolean).join('\n')

    void handleAIGenerate(prompt)
  }

  async function handleAIGenerate(overridePrompt?: string) {
    const prompt = overridePrompt ?? aiPrompt
    if (!prompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    try {
      const isStrengthSport = sport === 'gym' || sport === 'hyrox'

      // ── Le frontend envoie juste la description + le sport ──
      // Le system prompt complet est côté serveur dans /api/coach-stream
      // Si un parcours avec des montées est chargé, on les passe au prompt
      // En mode parcours, envoyer uniquement les côtes cochées (déjà dans le prompt)
      const parcoursClimbs: Array<{ startKm: number; endKm: number; distanceKm: number; elevationGainM: number; avgGradientPct: number; maxGradientPct: number }> | undefined =
        (aiFlowStep === 'parcours')
          ? climbConfigs
            .filter(c => c.selected)
            .map(c => {
              const seg = (parcoursData?.segments ?? [])[c.segIdx]
              if (!seg) return null
              return { startKm: seg.startKm, endKm: seg.endKm, distanceKm: seg.distanceKm, elevationGainM: seg.elevationDeltaM, avgGradientPct: seg.avgGradient, maxGradientPct: seg.maxGradient }
            }).filter((x): x is NonNullable<typeof x> => x !== null)
          : (parcoursData?.segments ? getSignificantClimbs(parcoursData.segments) : undefined)

      const payload = {
        messages: [{ role: 'user', content: prompt }],
        sport,
        parcoursClimbs: parcoursClimbs && parcoursClimbs.length > 0 ? parcoursClimbs : undefined,
        parcoursName:   parcoursData?.name,
        parcoursTotalKm: parcoursData?.distance,
      }
      if (aiFlowStep === 'parcours') {
        console.log('[parcours] payload climbs:', payload.parcoursClimbs?.length, 'prompt preview:', prompt.slice(0, 300))
      }

      const res = await fetch('/api/coach-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let raw = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const p = line.slice(6).trim()
            if (p === '[DONE]') continue
            try {
              const d = JSON.parse(p) as Record<string, unknown>
              if (typeof d.text === 'string') raw += d.text
            } catch { if (p !== '[DONE]') raw += p }
          }
        }
      }

      // ── Extraire le JSON ──
      let jsonStr = ''
      const arrayMatch = raw.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        jsonStr = arrayMatch[0]
      } else {
        const objMatch = raw.match(/\{[\s\S]*\}/)
        if (objMatch) {
          try {
            const obj = JSON.parse(objMatch[0]) as Record<string, unknown>
            if (Array.isArray(obj.blocks)) jsonStr = JSON.stringify(obj.blocks)
            else if (Array.isArray(obj.blocs)) jsonStr = JSON.stringify(obj.blocs)
            else if (Array.isArray(obj.exercises)) jsonStr = JSON.stringify(obj.exercises)
          } catch { /* continue */ }
        }
      }

      if (aiFlowStep === 'parcours') {
        console.log('[parcours] raw response (first 500):', raw.slice(0, 500))
      }
      if (!jsonStr) {
        setAiError(`L'IA n'a pas retourné de JSON valide. Réponse : ${raw.slice(0, 300) || '(vide)'}`)
        return
      }

      const parsed = JSON.parse(jsonStr) as Record<string, unknown>[]


      if (isStrengthSport) {
        // ── GYM / HYROX : convertir en Block[] pour BlockBuilder (support circuit_header) ──
        const newBlocks: Block[] = parsed.map((b: Record<string, unknown>, i: number) => {
          const labelStr = typeof b.label === 'string' ? b.label : 'Exercice'
          const blockType: BlockType = b.type === 'circuit_header' ? 'circuit_header' : 'effort'
          const setsVal = typeof b.zone === 'number' ? Math.max(1, Math.min(10, b.zone)) : 3
          const repsVal = typeof b.reps === 'number' ? b.reps : 8
          const weightRaw = parseFloat(String(b.value ?? ''))
          const weightStr = isNaN(weightRaw) || weightRaw <= 0 ? '' : String(weightRaw)
          const effortMinVal = typeof b.effortMin === 'number' ? b.effortMin : 0
          const recoveryMinVal = typeof b.recoveryMin === 'number' ? b.recoveryMin : 1.5
          const durationMinVal = typeof b.durationMin === 'number' && b.durationMin > 0 ? b.durationMin : (effortMinVal > 0 ? Math.ceil(effortMinVal * setsVal) : 0)
          return {
            id: `ai_${Date.now()}_${i}`,
            mode: 'single' as const,
            type: blockType,
            durationMin: durationMinVal,
            zone: setsVal,
            value: weightStr,
            hrAvg: typeof b.hrAvg === 'string' ? b.hrAvg : '',
            label: labelStr,
            reps: repsVal > 0 ? repsVal : undefined,
            effortMin: effortMinVal > 0 ? effortMinVal : undefined,
            recoveryMin: recoveryMinVal,
          }
        })
        if (newBlocks.length === 0) { setAiError("L'IA a retourné un tableau vide."); return }
        setBlocks(newBlocks)
        // Fix #5: sync dur to computed block total so TSS header stays accurate
        setDur(Math.round(newBlocks.reduce((s, bl) => s + bl.durationMin, 0)) || dur)
        setBuilderTab('manual')
        setAiPrompt('')
      } else {
        // ── ENDURANCE : convertir en Block[] pour BlockBuilder ──
        const newBlocks: Block[] = parsed.map((b: Record<string, unknown>, i: number) => {
          let effortMin = typeof b.effortMin === 'number' ? b.effortMin : 0
          let label = typeof b.label === 'string' ? b.label : 'Bloc'
          const value = String(b.value ?? '')
          const mode = typeof b.mode === 'string' ? b.mode : 'single'
          const repsN = typeof b.reps === 'number' ? b.reps : 1
          const recoveryMin = typeof b.recoveryMin === 'number' ? b.recoveryMin : 0
          const durationMin = typeof b.durationMin === 'number' ? b.durationMin : 0
          const distMatch = label.match(/(\d+)\s*m/i)
          const paceMatch = value.match(/(\d+):(\d+)/)
          if (distMatch && paceMatch && mode === 'interval') {
            const distM = parseInt(distMatch[1])
            const paceSec = parseInt(paceMatch[1]) * 60 + parseInt(paceMatch[2])
            const eSec = sport === 'swim' ? (distM / 100) * paceSec : (distM / 1000) * paceSec
            effortMin = Math.round(eSec / 60 * 100) / 100
            const lo = Math.round(eSec * 0.97), hi = Math.round(eSec * 1.03)
            const f = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
            label = `${distM}m — ${f(lo)} à ${f(hi)}`
          }
          const rawZone = typeof b.zone === 'number' ? b.zone : 3
          const zone = Math.max(1, Math.min(7, rawZone))
          return {
            id: `ai_${Date.now()}_${i}`,
            mode: (typeof b.mode === 'string' ? b.mode : 'single') as 'single' | 'interval',
            type: (typeof b.type === 'string' ? b.type : 'effort') as Block['type'],
            durationMin: mode === 'interval' ? Math.round(repsN * (effortMin + recoveryMin) * 100) / 100 : durationMin,
            zone, value, hrAvg: typeof b.hrAvg === 'string' ? b.hrAvg : '', label,
            reps: repsN || undefined,
            effortMin: effortMin || undefined,
            recoveryMin: recoveryMin || undefined,
            recoveryZone: typeof b.recoveryZone === 'number' ? b.recoveryZone : 1,
          }
        })
        if (newBlocks.length === 0) { setAiError("L'IA a retourné un tableau vide."); return }
        setBlocks(newBlocks)
        // Fix #5: sync dur to computed block total so TSS header stays accurate
        setDur(Math.round(newBlocks.reduce((s, bl) => s + bl.durationMin, 0)) || dur)
        // En mode parcours, on reste dans la vue parcours — les blocs sont
        // stockés pour la sauvegarde et le TSS, mais affichés uniquement
        // via les jauges SVG sur le graphique altimétrique.
        if (aiFlowStep !== 'parcours') setBuilderTab('manual')
        setAiPrompt('')
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[AI blocks] Error:', msg)
      setAiError(`Erreur : ${msg}`)
    } finally {
      setAiLoading(false)
    }
  }

  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--text-dim)',
    textTransform: 'uppercase' as const, letterSpacing: '0.10em',
    display: 'block', marginBottom: 7,
  }


  const TSS_SESSION = [
    { range: '0 – 50', label: 'Très facile', desc: 'Footing léger, sortie douce' },
    { range: '50 – 100', label: 'Facile à modérée', desc: 'Rythme modéré' },
    { range: '100 – 150', label: 'Modérée à difficile', desc: 'Séance soutenue' },
    { range: '150 – 200', label: 'Difficile', desc: 'Grosse séance, récup nécessaire' },
    { range: '> 200', label: 'Très difficile', desc: 'Compétition ou longue sortie intense' },
  ]
  const TSS_WEEKLY = [
    { range: '150 – 300', level: 'Débutant / Loisir' },
    { range: '300 – 500', level: 'Intermédiaire' },
    { range: '500 – 700', level: 'Confirmé / Amateur actif' },
    { range: '700 – 1000', level: 'Avancé / Compétiteur' },
    { range: '1000 – 1500', level: 'Élite / Semi-pro' },
  ]

  const fmtDurLocal = (m: number) => {
    if (m < 60) return `${m}min`
    const h = Math.floor(m / 60), rm = m % 60
    return rm === 0 ? `${h}h` : `${h}h${String(rm).padStart(2,'0')}`
  }

  // ── Early return : MODE EXÉCUTION ──
  if (executeMode) {
    // Pour les séances muscu/hyrox créées avec ExerciseListBuilder,
    // on reconstruit les blocks avec circuit_headers (contenant le bon mode/type de circuit)
    const execBlocks = isStrength && exercises.length > 0 && gymCircuitsRef.current.length > 0
      ? exercisesToBlocks(exercises, gymCircuitsRef.current, gymCircuitMapRef.current)
      : blocks
    return (
      <SessionExecute
        blocks={execBlocks}
        sport={sport}
        sessionTitle={title || SPORT_LABEL[sport]}
        onExit={() => setExecuteMode(false)}
        exoHistory={exoHistory}
      />
    )
  }

  return (
    <>
      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); opacity: 0.5; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed' as const, inset: 0, zIndex: 998,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
      }} />

      {/* Bottom sheet — flex column */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed' as const, bottom: 0, left: 0, right: 0, height: '96dvh', zIndex: 999,
        background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column' as const,
        overflow: 'hidden',
        animation: 'sheetUp .38s cubic-bezier(.2,.8,.2,1) forwards',
      }}>

        {/* Poignée */}
        <div style={{ width: 36, height: 4, borderRadius: 4, background: 'var(--border)', margin: '10px auto 0', flexShrink: 0 }} />

        {/* HEADER */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--bg-card)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 12px 4px 4px', borderRadius: 99,
            background: `${accent}18`, border: `1px solid ${accent}35`,
            flexShrink: 0,
          }}>
            <SportIcon sport={sport} size={26} />
            <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{SPORT_LABEL[sport]}</span>
          </div>

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={`${SPORT_LABEL[sport]} ${trainingTypes.join('+')}`}
            style={{
              flex: 1, background: 'none', border: 'none',
              color: 'var(--text)',
              fontSize: mobile ? 16 : 18,
              fontWeight: 700, outline: 'none', padding: 0,
              minWidth: 0,
            }}
          />

          <span style={{
            fontSize: 11, fontWeight: 700, flexShrink: 0,
            color: selPlan === 'A' ? '#22d3ee' : '#a78bfa',
            background: selPlan === 'A' ? 'rgba(34,211,238,0.1)' : 'rgba(167,139,250,0.1)',
            border: `1px solid ${selPlan === 'A' ? 'rgba(34,211,238,0.25)' : 'rgba(167,139,250,0.25)'}`,
            borderRadius: 6, padding: '3px 10px',
          }}>Plan {selPlan}</span>

          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>✕</button>
        </div>

        {/* BODY scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: mobile ? '20px 16px 40px' : '24px 28px 40px' }}>

        {/* Hidden file input — shared by all Parcours buttons */}
        <input
          ref={parcoursInputRef}
          type="file"
          accept=".gpx,.tcx,.kml"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setParcoursFile(f)
            setParcoursLoading(true)
            setParcoursError(null)
            try {
              const data = await parseRouteFile(f)
              // Sauvegarde en Supabase — async, non bloquante pour l'UI
              let parcoursId: string | undefined
              try {
                const res = await fetch('/api/parcours', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name:             data.name,
                    totalKm:          data.distance,
                    elevationGainM:   data.elevation,
                    elevationLossM:   null,
                    elevationProfile: data.elevationProfile,
                    segments:         data.segments ?? [],
                  }),
                })
                if (res.ok) {
                  const json = await res.json() as { id?: string }
                  parcoursId = json.id
                }
              } catch { /* non critique — l'UI fonctionne sans sauvegarde DB */ }
              setParcoursData({ ...data, parcoursId })
            } catch (err) {
              setParcoursError(err instanceof Error ? err.message : 'Erreur de lecture')
              setParcoursData(null)
            } finally {
              setParcoursLoading(false)
              if (parcoursInputRef.current) parcoursInputRef.current.value = ''
            }
          }}
        />

        {/* TITRE — en-tête : pastille sport + titre + sous-type + actions */}
        <div style={{ padding: mobile ? '14px 16px 14px' : '18px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: accent, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={`${SPORT_LABEL[sport]} ${trainingTypes.join('+')}`}
              style={{
                width: '100%', background: 'none', border: 'none', color: 'var(--text)',
                fontSize: mobile ? 19 : 23, fontWeight: 700, outline: 'none', padding: 0, minWidth: 0,
                fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
              }} />
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {SPORT_LABEL[sport]}{trainingTypes.length ? ` · ${trainingTypes.join(' + ')}` : ''}
            </p>
          </div>
          <button onClick={handleExportPDF} title="Exporter en PDF"
            style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8.5L2 4.5h2.5V1h3v3.5H10L6 8.5Z" fill="currentColor"/>
              <rect x="1" y="10" width="10" height="1.2" rx="0.6" fill="currentColor"/>
            </svg>
          </button>
          <button onClick={() => parcoursInputRef.current?.click()} title="Importer un parcours GPX/TCX/KML"
            style={{ flexShrink: 0, height: 34, padding: parcoursData ? '0 11px' : 0, width: parcoursData ? undefined : 34, borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border)', background: parcoursData ? `${accent}12` : 'transparent', color: parcoursData ? accent : 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 600 }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 1.5C4.07 1.5 2.5 3.07 2.5 5c0 2.5 3.5 5.5 3.5 5.5s3.5-3 3.5-5.5C9.5 3.07 7.93 1.5 6 1.5Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" fill="currentColor"/>
            </svg>
            {parcoursLoading ? '…' : parcoursData && parcoursData.distance != null ? `${parcoursData.distance}km` : ''}
          </button>
        </div>

        {/* Favoris (mode create seulement) */}
        {mode === 'create' && favorites.length > 0 && (
          <div style={{ padding: mobile ? '0 16px 10px' : '0 24px 12px' }}>
            <button onClick={() => setShowFavorites(!showFavorites)} style={{
              width: '100%', padding: '9px', borderRadius: 8,
              border: '1px solid var(--border)', background: showFavorites ? `${accent}10` : 'var(--bg-card2)',
              color: showFavorites ? accent : 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600,
            }}>
              ★ Charger un favori ({favorites.length})
            </button>
            {showFavorites && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                {favorites.map(fav => (
                  <button key={fav.id} onClick={() => {
                    setSport(fav.sport as SportType)
                    setTrainingTypes(fav.training_type ? fav.training_type.split('+').filter(Boolean) : [])
                    setTitle(fav.name)
                    setBlocks(fav.blocks_data ?? [])
                    setNutritionItems(fav.nutrition_data ?? [])
                    setDur(fav.duration_min ?? 60)
                    setRpe(fav.rpe ?? 5)
                    setDesc(fav.notes ?? '')
                    setShowFavorites(false)
                  }} style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, textAlign: 'left' as const,
                    border: '1px solid var(--border)', background: 'var(--bg-card2)',
                    color: 'var(--text)', fontSize: 12, cursor: 'pointer',
                  }}>
                    <span style={{ fontWeight: 600 }}>{fav.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>{SPORT_LABEL[fav.sport as SportType] ?? fav.sport} · {formatHM(fav.duration_min ?? 60)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DEUX COLONNES */}
        <div style={{
          padding: mobile ? '16px' : '20px 24px',
          display: mobile ? 'flex' : 'grid',
          flexDirection: mobile ? 'column' as const : undefined,
          gridTemplateColumns: mobile ? undefined : '1fr 1fr',
          gap: mobile ? 14 : 20,
          alignItems: 'start' as const,
        }}>
          {/* GAUCHE — carte paramètres */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: mobile ? 14 : 20, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 14, padding: mobile ? 16 : 18 }}>
            {/* Sport — tous les logos sur une ligne, clic = sélection */}
            <div>
              <span style={lbl}>Sport</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                {(Object.keys(SPORT_LABEL) as SportType[]).map(sp => {
                  const selected = sp === sport
                  return (
                    <button key={sp} onClick={() => handleSportChange(sp)} title={SPORT_LABEL[sp]}
                      style={{
                        display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 5,
                        padding: '6px 4px', borderRadius: 10, cursor: 'pointer',
                        border: 'none', background: 'transparent',
                        minWidth: 48, flex: '1 1 0',
                        opacity: selected ? 1 : 0.4,
                        transition: 'opacity .15s, transform .15s',
                        transform: selected ? 'scale(1.06)' : 'scale(1)',
                      }}
                      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
                      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.opacity = '0.4' }}>
                      <SportIcon sport={sp} size={24} circle={false} />
                      <span style={{ fontSize: 10, fontWeight: selected ? 700 : 600, color: selected ? 'var(--text)' : 'var(--text-dim)', whiteSpace: 'nowrap' as const }}>{SPORT_SHORT[sp]}</span>
                    </button>
                  )
                })}
              </div>

              {sport === 'bike' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {(Object.keys(CYCLING_SUB_LABEL) as CyclingSub[]).map(sub => (
                    <button key={sub} onClick={() => setCyclingSub(sub)} style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: cyclingSub === sub ? `1px solid ${accent}` : '1px solid var(--border)',
                      background: cyclingSub === sub ? `${accent}15` : 'transparent',
                      color: cyclingSub === sub ? accent : 'var(--text-dim)',
                    }}>{CYCLING_SUB_LABEL[sub]}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Type de séance */}
            {trainTypes.length > 0 && (
              <div>
                <span style={lbl}>Type de séance</span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                  {trainTypes.map(t => {
                    const active = trainingTypes.includes(t)
                    return (
                      <button key={t} onClick={() => {
                        const next = active ? trainingTypes.filter(x => x !== t) : [...trainingTypes, t]
                        setTrainingTypes(next)
                        if (!active && !title) setTitle(`${SPORT_LABEL[sport]} ${next.join('+')}`)
                      }} style={{
                        padding: mobile ? '5px 11px' : '6px 14px', borderRadius: 7,
                        fontSize: mobile ? 10 : 11, fontWeight: 600, cursor: 'pointer',
                        background: active ? accent : 'var(--bg-card)',
                        color: active ? '#fff' : 'var(--text-dim)',
                        border: active ? 'none' : '1px solid var(--border)',
                        transition: 'all 0.12s',
                      }}>{t}</button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Date + Heure */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <span style={lbl}>Date</span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
                  padding: '9px 12px', borderRadius: 9, width: '100%', boxSizing: 'border-box' as const,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-dim)', fontSize: 12, fontFamily: 'DM Mono, monospace', outline: 'none',
                }} />
              </div>
              <div>
                <span style={lbl}>Heure</span>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{
                  padding: '9px 12px', borderRadius: 9, width: 100,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-dim)', fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 600, outline: 'none',
                }} />
              </div>
            </div>
          </div>

          {/* DROITE */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: mobile ? 14 : 24 }}>
            {/* RPE */}
            <div style={{
              padding: '16px 18px', borderRadius: 14,
              border: '1px solid var(--border)', background: 'var(--bg-card2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <span style={lbl}>Effort perçu</span>
                  <p style={{ fontSize: 12.5, color: rpeCol, fontWeight: 700, margin: '3px 0 0', letterSpacing: '0.01em' }}>
                    {rpe <= 2 ? 'Très facile' : rpe <= 4 ? 'Facile' : rpe <= 6 ? 'Modéré' : rpe <= 8 ? 'Difficile' : 'Maximal'}
                  </p>
                </div>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 2, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                  <span style={{ fontSize: 34, fontWeight: 700, color: rpeCol, letterSpacing: '-0.02em' }}>{rpe}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>/10</span>
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <button key={i} onClick={() => setRpe(i + 1)} aria-label={`RPE ${i + 1}`}
                    style={{ flex: 1, height: 18, borderRadius: 5, border: 'none', cursor: 'pointer', padding: 0, background: i < rpe ? rpeCol : 'var(--bg-elev)', transition: 'background 0.1s' }} />
                ))}
              </div>
            </div>

            {/* Durée — stepper compact */}
            <div style={{ padding: '14px 18px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={lbl}>Durée</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setDur(Math.max(5, dur - 5))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--text-mid)', fontSize: 16, cursor: 'pointer', padding: 0 }}>−</button>
                <span style={{ fontSize: 21, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', minWidth: 74, textAlign: 'center' as const }}>{fmtDurLocal(dur)}</span>
                <button onClick={() => setDur(Math.min(360, dur + 5))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--text-mid)', fontSize: 16, cursor: 'pointer', padding: 0 }}>+</button>
              </div>
            </div>

            {/* Donut + TSS — only for endurance with blocks */}
            {showDonuts ? (
              <div>
                {/* ── Donuts row ── */}
                <div style={{ display: 'flex', gap: mobile ? 12 : 20, alignItems: 'flex-start', flexWrap: 'wrap' as const }}>
                  {/* Donut Zones — 160×160px, 20px ring */}
                  {(() => {
                    const SIZE = 118, CX = 59, CY = 59, R_OUT = 52, R_IN = 38
                    const GAP_RAD = 0.025
                    let angle = -Math.PI / 2
                    const arcs = zoneDist.map((v, i) => {
                      if (v === 0) return null
                      const pct = v / 100
                      const sweep = pct * 2 * Math.PI
                      const startA = angle + GAP_RAD / 2
                      const endA   = angle + sweep - GAP_RAD / 2
                      angle += sweep
                      if (endA <= startA) return null
                      const lg = endA - startA > Math.PI ? 1 : 0
                      const p = (r: number, a: number) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) })
                      const os = p(R_OUT, startA), oe = p(R_OUT, endA)
                      const is = p(R_IN, startA),  ie = p(R_IN, endA)
                      return (
                        <path key={i}
                          d={`M${os.x.toFixed(1)} ${os.y.toFixed(1)} A${R_OUT} ${R_OUT} 0 ${lg} 1 ${oe.x.toFixed(1)} ${oe.y.toFixed(1)} L${ie.x.toFixed(1)} ${ie.y.toFixed(1)} A${R_IN} ${R_IN} 0 ${lg} 0 ${is.x.toFixed(1)} ${is.y.toFixed(1)} Z`}
                          fill={DONUT_ZONE_COLORS[i]} opacity={0.9}
                          style={{ transition: 'opacity 0.2s' }}
                        />
                      )
                    })
                    // Compute dominant zone avg watts
                    const avgW = sessionAvg.avgWatts
                    const avgHR = hrDist.length > 0 ? (() => {
                      const lthr = lthrForSport ?? 170
                      const zoneHRs = [lthr * 0.60, lthr * 0.84, lthr * 0.91, lthr * 0.98, lthr * 1.04, lthr * 1.09, lthr * 1.15]
                      let sum = 0, tot = 0
                      hrDist.forEach(h => { sum += h.pct * (zoneHRs[0] ?? 130); tot += h.pct })
                      return tot > 0 ? Math.round(sum / tot) : null
                    })() : null
                    // Glucides g/h estimate: ~60g/h per 100 TSS/h, scaled
                    const tssPerH = dur > 0 ? sessionStats.tssHigh / (dur / 60) : 0
                    const glucGph = Math.round(Math.min(90, Math.max(20, tssPerH * 0.55)))
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8 }}>
                        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                          {/* Background ring */}
                          <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke="var(--border)" strokeWidth={R_OUT - R_IN} opacity={0.25} />
                          {arcs}
                          {/* Center text: duration */}
                          <text x={CX} y={CY - 6} textAnchor="middle" fontSize={14} fill="var(--text)" fontWeight={800} fontFamily="var(--font-display)">{fmtDurLocal(dur)}</text>
                          <text x={CX} y={CY + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#06B6D4" fontFamily="var(--font-display)">SM {smsn.sm}</text>
                          <text x={CX} y={CY + 26} textAnchor="middle" fontSize={10} fontWeight={700} fill="#8B5CF6" fontFamily="var(--font-display)">SN {smsn.sn}</text>
                        </svg>
                        {/* Compact legend */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '3px 8px', justifyContent: 'center' }}>
                          {zoneDist.map((v, i) => v > 0 && (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: DONUT_ZONE_COLORS[i], flexShrink: 0, display: 'inline-block' }} />
                              <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>{DONUT_ZONE_LABELS[i]} <strong style={{ color: 'var(--text-mid)' }}>{v}%</strong></span>
                            </div>
                          ))}
                        </div>
                        {/* 3 key metrics */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                          <div style={{ textAlign: 'center' as const }}>
                            <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: '#FBBF24' }}>{glucGph}</div>
                            <div style={{ fontSize: 8, color: 'var(--text-dim)' }}>g gluc/h</div>
                          </div>
                          {avgW && (
                            <div style={{ textAlign: 'center' as const }}>
                              <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: accent }}>{avgW}W</div>
                              <div style={{ fontSize: 8, color: 'var(--text-dim)' }}>Moy W</div>
                            </div>
                          )}
                          {avgHR && (
                            <div style={{ textAlign: 'center' as const }}>
                              <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: '#EF4444' }}>{avgHR}</div>
                              <div style={{ fontSize: 8, color: 'var(--text-dim)' }}>FC Moy</div>
                            </div>
                          )}
                          <div style={{ textAlign: 'center' as const }}>
                            <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#8B5CF6' }}>{smsn.sn}</div>
                            <div style={{ fontSize: 8, color: 'var(--text-dim)' }}>SN neuro.</div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Donut FC */}
                  {hrDist.length > 0 && (() => {
                    const SIZE = 120, CX = 60, CY = 60, R_OUT = 52, R_IN = 36
                    const GAP_RAD = 0.025
                    let angle = -Math.PI / 2
                    const total = hrDist.reduce((a, b) => a + b.pct, 0) || 1
                    const arcs = hrDist.map((h, i) => {
                      const pct = h.pct / total
                      const sweep = pct * 2 * Math.PI
                      const startA = angle + GAP_RAD / 2
                      const endA   = angle + sweep - GAP_RAD / 2
                      angle += sweep
                      if (endA <= startA) return null
                      const lg = endA - startA > Math.PI ? 1 : 0
                      const p = (r: number, a: number) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) })
                      const os = p(R_OUT, startA), oe = p(R_OUT, endA)
                      const is = p(R_IN, startA),  ie = p(R_IN, endA)
                      return (
                        <path key={i}
                          d={`M${os.x.toFixed(1)} ${os.y.toFixed(1)} A${R_OUT} ${R_OUT} 0 ${lg} 1 ${oe.x.toFixed(1)} ${oe.y.toFixed(1)} L${ie.x.toFixed(1)} ${ie.y.toFixed(1)} A${R_IN} ${R_IN} 0 ${lg} 0 ${is.x.toFixed(1)} ${is.y.toFixed(1)} Z`}
                          fill={h.color} opacity={0.88}
                        />
                      )
                    })
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6 }}>
                        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                          <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke="var(--border)" strokeWidth={R_OUT - R_IN} opacity={0.25} />
                          {arcs}
                          <text x={CX} y={CY + 4} textAnchor="middle" fontSize={9} fill="var(--text)" fontWeight={700} fontFamily="DM Mono,monospace">FC</text>
                        </svg>
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
                          {hrDist.map((h, i) => h.pct > 0 && (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: h.color, flexShrink: 0, display: 'inline-block' }} />
                              <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono,monospace' }}>{h.label} <strong style={{ color: 'var(--text-mid)' }}>{Math.round(h.pct)}%</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ) : (
              /* Fallback: SM / SN */
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ textAlign: 'center' as const }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>SM métab.</span>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#06B6D4', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', margin: '2px 0 0' }}>{smsn.sm}</p>
                </div>
                <div style={{ textAlign: 'center' as const }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>SN neuro.</span>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#8B5CF6', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', margin: '2px 0 0' }}>{smsn.sn}</p>
                </div>
                {blocks.length === 0 && (
                  <p style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic', flex: 1 }}>
                    Ajoute des blocs pour voir les zones
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Watts / allure estimés + références athlète en dessous */}
          {(() => {
            const hasEstimate = !!(sessionAvg.avgWatts || sessionAvg.avgPace)
            // Référence de l'athlète selon le sport
            const ref = (() => {
              if (!athleteData) return null
              if ((sport === 'bike' || sport === 'elliptique') && athleteData.ftp)
                return { label: 'FTP', value: `${athleteData.ftp}W` }
              if (sport === 'run' && athleteData.runThresholdPaceStr)
                return { label: 'Seuil', value: `${athleteData.runThresholdPaceStr}/km` }
              if (sport === 'swim' && athleteData.swimCSSStr)
                return { label: 'CSS', value: `${athleteData.swimCSSStr}/100m` }
              if (sport === 'rowing' && athleteData.rowThresholdSecPer500m) {
                const s = athleteData.rowThresholdSecPer500m
                return { label: 'Seuil', value: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}/500m` }
              }
              return null
            })()
            // FC données athlète (tous sports)
            const hrRef = lthrForSport
              ? { label: athleteData?.lthrRun || athleteData?.lthrBike ? 'LTHR' : 'LTHR est.', value: String(lthrForSport) }
              : athleteData?.hrMax
                ? { label: 'FC max', value: String(athleteData.hrMax) }
                : null

            if (!hasEstimate && !ref && !hrRef) return null
            return (
              <div style={{ marginTop: mobile ? 10 : 14, paddingTop: mobile ? 10 : 12, borderTop: '1px solid var(--border)' }}>
                {/* Ligne principale : estimation */}
                {hasEstimate && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', lineHeight: 1.4 }}>
                      {sport === 'bike' || sport === 'elliptique' ? 'Watts moy. estimés' : 'Allure moy. estimée'}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: accent, fontFamily: '"DM Mono", monospace', letterSpacing: '-0.02em' }}>
                      {sessionAvg.avgWatts ? `${sessionAvg.avgWatts}W` : sessionAvg.avgPace}
                    </span>
                  </div>
                )}
                {/* Sous-ligne : seuil / FTP / CSS / LTHR de l'athlète */}
                {(ref || hrRef) && (
                  <div style={{ display: 'flex', gap: 12, marginTop: hasEstimate ? 5 : 0, flexWrap: 'wrap' as const }}>
                    {ref && (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {ref.label}{' '}
                        <strong style={{ fontFamily: '"DM Mono", monospace', color: 'var(--text-mid)', fontWeight: 700 }}>{ref.value}</strong>
                      </span>
                    )}
                    {hrRef && (
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {hrRef.label}{' '}
                        <strong style={{ fontFamily: '"DM Mono", monospace', color: 'var(--text-mid)', fontWeight: 700 }}>{hrRef.value}</strong>
                        {athleteData?.hrMax && (
                          <span style={{ fontSize: 8, color: 'var(--text-dim)', marginLeft: 4 }}>/ FC max {athleteData.hrMax}</span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* TSS INFO MODAL */}
        {tssInfo && (
          <div onClick={() => setTssInfo(false)} style={{ position: 'fixed' as const, inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 20, maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto' as const, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'Syne, sans-serif' }}>TSS — Training Stress Score</h3>
                <button onClick={() => setTssInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 16, cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 14px', lineHeight: 1.6 }}>Mesure la charge d&apos;entraînement. Calculé selon l&apos;intensité et la durée.</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.10em', marginBottom: 6 }}>Par séance</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, marginBottom: 16 }}>
                <tbody>{TSS_SESSION.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--text-dim)', width: 70 }}>{r.range}</td>
                    <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-dim)' }}>{r.label}</td>
                    <td style={{ padding: '6px 8px', fontSize: 10, color: 'var(--text-dim)' }}>{r.desc}</td>
                  </tr>
                ))}</tbody>
              </table>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.10em', marginBottom: 6 }}>Par semaine</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                <tbody>{TSS_WEEKLY.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', fontSize: 11, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--text-dim)', width: 90 }}>{r.range}</td>
                    <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-dim)' }}>{r.level}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* SÉPARATEUR 1 — entre deux-colonnes et Description */}
        <div style={{ height: 1, background: 'var(--border)', margin: mobile ? '12px 16px' : '16px 24px', opacity: 0.5 }} />

        {/* DESCRIPTION */}
        <div style={{ padding: mobile ? '24px 16px 24px' : '24px 24px 24px' }}>
          <span style={lbl}>Description et objectifs</span>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={mobile ? 3 : 4}
            placeholder="Décris la séance, les objectifs, les sensations recherchées..."
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box' as const,
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-dim)', fontSize: 12, outline: 'none', resize: 'vertical' as const,
              fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6,
            }} />
        </div>

        {/* PARCOURS */}
        {(parcoursLoading || parcoursError || parcoursData) && (
          <div style={{ padding: mobile ? '0 16px 16px' : '0 24px 18px' }}>
            {parcoursLoading && (
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>Lecture du parcours…</p>
            )}
            {parcoursError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span style={{ fontSize: 11, color: '#ef4444', flex: 1 }}>⚠ {parcoursError}</span>
                <button onClick={() => { setParcoursFile(null); setParcoursData(null); setParcoursError(null) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            )}
            {parcoursData && (
              <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {/* En-tête : nom + métriques + supprimer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{parcoursData.name}</span>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
                    {parcoursData.distance != null && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        <strong style={{ color: accent, fontFamily: '"DM Mono",monospace', fontSize: 13 }}>{parcoursData.distance}</strong> km
                      </span>
                    )}
                    {parcoursData.elevation != null && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        <strong style={{ color: 'var(--text)', fontFamily: '"DM Mono",monospace', fontSize: 13 }}>{parcoursData.elevation}</strong> m D+
                      </span>
                    )}
                    {parcoursData.distance != null && dur > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        <strong style={{ color: 'var(--text)', fontFamily: '"DM Mono",monospace', fontSize: 13 }}>
                          {Math.round((parcoursData.distance / (dur / 60)) * 10) / 10}
                        </strong> km/h
                      </span>
                    )}
                  </div>
                  <button onClick={() => { setParcoursFile(null); setParcoursData(null) }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-dim)', cursor: 'pointer', fontSize: 10, padding: '3px 10px', flexShrink: 0 }}>
                    Supprimer
                  </button>
                </div>

                {/* Carte GPS Leaflet */}
                {parcoursData.gpsTrace && parcoursData.gpsTrace.length > 1 && (
                  <div style={{ marginBottom: 12 }}>
                    <GPSMapWrapper
                      trace={parcoursData.gpsTrace}
                      accent={accent}
                      hoveredKm={hoveredKm}
                      elevationProfile={parcoursData.elevationProfile}
                    />
                  </div>
                )}

                {/* Graphique altimétrique interactif */}
                {parcoursData.elevationProfile.length > 1 && (
                  <div style={{ position: 'relative' as const }}>
                    {/* Bouton + pour dessin de bloc spécifique */}
                    <button
                      onClick={() => { setDrawModeActive(v => !v); setPendingBlock(null) }}
                      title={drawModeActive ? 'Annuler le dessin' : 'Dessiner un bloc spécifique'}
                      style={{
                        position: 'absolute' as const, top: 4, right: 4, zIndex: 10,
                        width: 26, height: 26, borderRadius: 6,
                        border: drawModeActive ? `2px solid #f97316` : '1px solid var(--border)',
                        background: drawModeActive ? 'rgba(249,115,22,0.15)' : 'var(--bg-card)',
                        color: drawModeActive ? '#f97316' : 'var(--text-dim)',
                        fontSize: 18, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                      }}
                    >{drawModeActive ? '×' : '+'}</button>

                    {/* Popup saisie du nouveau bloc */}
                    {pendingBlock && (() => {
                      const pb_ftp  = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250
                      const pb_lthr = athleteData?.lthrBike ?? athleteData?.lthrRun ?? 170
                      const displayPW = pendingWatts
                      const displayPH = pendingHr > 0 ? pendingHr : wattToFc(pendingWatts, pb_ftp, pb_lthr)
                      const left = `${Math.min(Math.max(pendingBlock.anchorPct * 100, 5), 75)}%`
                      return (
                        <div style={{
                          position: 'absolute' as const, top: 28, left,
                          zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.28)', padding: '14px 16px',
                          minWidth: 220,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                            Nouveau bloc · km {pendingBlock.startKm} → {pendingBlock.endKm}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 10 }}>
                            {(pendingBlock.endKm - pendingBlock.startKm).toFixed(1)} km
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-dim)', width: 28 }}>Watts</span>
                              <LocalInput
                                value={displayPW}
                                min={50} max={600}
                                onCommit={w => { setPendingWatts(w); setPendingHr(wattToFc(w, pb_ftp, pb_lthr)) }}
                                style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: `1px solid ${accent}50`, background: 'var(--bg-card2)', color: accent, fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono,monospace', textAlign: 'right' as const, outline: 'none' }}
                              />
                              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>W</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-dim)', width: 28 }}>FC</span>
                              <LocalInput
                                value={displayPH}
                                min={60} max={220}
                                onCommit={hr => setPendingHr(hr)}
                                style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #ef444450', background: 'var(--bg-card2)', color: '#ef4444', fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono,monospace', textAlign: 'right' as const, outline: 'none' }}
                              />
                              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>bpm</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                              <button
                                onClick={() => {
                                  const applyHr = pendingHr > 0 ? pendingHr : wattToFc(pendingWatts, pb_ftp, pb_lthr)
                                  const dist = Math.max(0.1, pendingBlock.endKm - pendingBlock.startKm)
                                  const grad = (() => {
                                    const sp = parcoursData?.elevationProfile.find(p => p.distKm >= pendingBlock.startKm)
                                    const ep = parcoursData?.elevationProfile.find(p => p.distKm >= pendingBlock.endKm)
                                    return sp && ep ? ((ep.ele - sp.ele) / (dist * 1000)) * 100 : 0
                                  })()
                                  const mins = estimateTimeOnSegment(dist, grad, pendingWatts, athleteWeight, bikeWeight)
                                  setSpecificBlocks(prev => [...prev, {
                                    id: `sb_${Date.now()}`,
                                    startKm: pendingBlock.startKm,
                                    endKm: pendingBlock.endKm,
                                    watts: pendingWatts,
                                    hrAvg: applyHr,
                                    estimatedMin: mins,
                                  }])
                                  setPendingBlock(null)
                                  setDrawModeActive(false)
                                }}
                                style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                              >Créer le bloc</button>
                              <button
                                onClick={() => { setPendingBlock(null); setDrawModeActive(false) }}
                                style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer' }}
                              >Annuler</button>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    <ElevationChart
                      profile={parcoursData.elevationProfile}
                      totalKm={parcoursData.distance ?? parcoursData.elevationProfile[parcoursData.elevationProfile.length - 1].distKm}
                      accent={accent}
                      onHover={setHoveredKm}
                      terrainBlocks={(() => {
                        const ftpVal = athleteData?.ftp ?? 200
                        const wToColor = (w: number) => {
                          const r = w / ftpVal
                          if (r > 1.50) return '#6B21A8'
                          if (r > 1.20) return '#991B1B'
                          if (r > 1.05) return '#ef4444'
                          if (r > 0.87) return '#f97316'
                          if (r > 0.75) return '#eab308'
                          if (r > 0.55) return '#22c55e'
                          return '#9ca3af'
                        }
                        if (builderTab === 'ai' && aiFlowStep === 'parcours') {
                          // Overlays des segments côtes pour le flow parcours IA
                          const segsAll = parcoursData.segments ?? []
                          return climbConfigs.map((cfg, ci) => {
                            const seg = segsAll[cfg.segIdx]
                            if (!seg) return null
                            const c = cfg.selected ? wToColor(cfg.watts) : '#6b7280'
                            return {
                              label: `Côte ${ci + 1}`,
                              startKm: seg.startKm,
                              endKm: seg.endKm,
                              zone: 3,
                              value: cfg.selected ? String(cfg.watts) : '',
                              blockIdx: ci,
                              color: c,
                            }
                          }).filter((x): x is NonNullable<typeof x> => x !== null)
                        }
                        return blocks.filter(b => b._startKm != null).map((b, idx) => ({
                          label: b.label,
                          startKm: b._startKm!,
                          endKm: b._endKm!,
                          zone: b.zone,
                          value: b.value,
                          blockIdx: idx,
                        }))
                      })()}
                      onBlockClick={aiFlowStep === 'parcours'
                        ? (ci) => setClimbConfigs(prev => prev.map((c, i) => i === ci ? { ...c, selected: !c.selected } : c))
                        : undefined
                      }
                      powerGauges={!!parcoursData && (parcoursData.segments?.length ?? 0) > 0
                        ? (() => {
                            console.log('climbConfigs total:', climbConfigs.length)
                            console.log('climbConfigs selected:', climbConfigs.filter(c => c.selected).length)
                            const ftp2 = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250
                            const segments = parcoursData.segments!
                            const routeKm = parcoursData.distance ?? (parcoursData.elevationProfile.length > 0 ? parcoursData.elevationProfile[parcoursData.elevationProfile.length - 1].distKm : 0)

                            const wColor = (w: number) => {
                              const r = w / ftp2
                              return r > 1.50 ? '#6B21A8' : r > 1.20 ? '#991B1B' : r > 1.05 ? '#ef4444' : r > 0.87 ? '#f97316' : r > 0.75 ? '#eab308' : r > 0.55 ? '#22c55e' : '#9ca3af'
                            }

                            const selectedClimbs = climbConfigs
                              .filter(c => c.selected)
                              .sort((a, b) => segments[a.segIdx].startKm - segments[b.segIdx].startKm)

                            const gauges: Array<{ blockIdx: number; startKm: number; endKm: number; watts: number; ftpRef: number; color: string; label: string; name?: string; estimatedMin: number; hrAvg?: number }> = []
                            let efIdx = 0

                            const pushEF = (s: number, e: number) => {
                              if (e - s < 0.05) return
                              const distKm = Math.round((e - s) * 10) / 10
                              const efNum = efIdx + 1
                              gauges.push({
                                blockIdx: -(efIdx++ + 1000),
                                startKm: Math.round(s * 10) / 10,
                                endKm: Math.round(e * 10) / 10,
                                watts: efWatts,
                                ftpRef: ftp2,
                                color: wColor(efWatts),
                                label: `EF${efNum}`,
                                name: `Endurance fondamentale ${efNum}`,
                                estimatedMin: estimateTimeOnSegment(distKm, 0, efWatts, athleteWeight, bikeWeight),
                              })
                            }

                            if (selectedClimbs.length === 0) {
                              // No selected climbs → one full EF block
                              pushEF(0, routeKm)
                            } else {
                              // Gap before first climb
                              pushEF(0, segments[selectedClimbs[0].segIdx].startKm)

                              for (let i = 0; i < selectedClimbs.length; i++) {
                                const cc = selectedClimbs[i]
                                const seg = segments[cc.segIdx]
                                const climbNum = i + 1
                                // Climb gauge
                                gauges.push({
                                  blockIdx: cc.segIdx,
                                  startKm: seg.startKm,
                                  endKm: seg.endKm,
                                  watts: cc.watts,
                                  ftpRef: ftp2,
                                  color: wColor(cc.watts),
                                  label: `Côte ${climbNum}`,
                                  name: `Côte ${climbNum} — km ${seg.startKm} → ${seg.endKm}`,
                                  estimatedMin: estimateTimeOnSegment(seg.distanceKm, seg.avgGradient, cc.watts, athleteWeight, bikeWeight),
                                })
                                // EF gap until next climb (or end)
                                const nextStart = i < selectedClimbs.length - 1
                                  ? segments[selectedClimbs[i + 1].segIdx].startKm
                                  : routeKm
                                pushEF(seg.endKm, nextStart)
                              }
                            }

                            // Subtract specificBlock ranges from existing gauges (no visual overlap)
                            let finalGauges = [...gauges]
                            for (const sb of specificBlocks) {
                              finalGauges = finalGauges.flatMap(g => {
                                if (g.endKm <= sb.startKm || g.startKm >= sb.endKm) return [g]
                                const parts: typeof gauges = []
                                if (g.startKm < sb.startKm) {
                                  const d = sb.startKm - g.startKm
                                  parts.push({ ...g, endKm: sb.startKm, estimatedMin: estimateTimeOnSegment(d, 0, g.watts, athleteWeight, bikeWeight) })
                                }
                                if (g.endKm > sb.endKm) {
                                  const d = g.endKm - sb.endKm
                                  parts.push({ ...g, startKm: sb.endKm, estimatedMin: estimateTimeOnSegment(d, 0, g.watts, athleteWeight, bikeWeight) })
                                }
                                return parts
                              })
                            }
                            // Add specific blocks after trimming
                            specificBlocks.forEach((sb, si) => {
                              finalGauges.push({
                                blockIdx: -(si + 2000),
                                startKm: sb.startKm,
                                endKm: sb.endKm,
                                watts: sb.watts,
                                ftpRef: ftp2,
                                color: wColor(sb.watts),
                                label: `Bloc ${si + 1}`,
                                name: `Bloc spécifique ${si + 1} — km ${sb.startKm} → ${sb.endKm}`,
                                estimatedMin: sb.estimatedMin,
                                hrAvg: sb.hrAvg,
                              })
                            })
                            const gauges_final = finalGauges

                            return gauges_final
                          })()
                        : undefined
                      }
                      onGaugeWattsChange={(bidx, newWatts) => {
                        if (bidx >= 0) {
                          // Climb segment
                          const mins = (() => {
                            const seg = (parcoursData?.segments ?? [])[bidx]
                            if (!seg) return 1
                            return estimateTimeOnSegment(seg.distanceKm, seg.avgGradient, newWatts, athleteWeight, bikeWeight)
                          })()
                          setClimbConfigs(prev => prev.map(c => c.segIdx === bidx ? { ...c, watts: newWatts, estimatedMin: mins } : c))
                        } else if (bidx <= -2000) {
                          // Specific block
                          const si = -(bidx + 2000)
                          setSpecificBlocks(prev => prev.map((sb, i) => {
                            if (i !== si) return sb
                            const dist = Math.max(0.1, sb.endKm - sb.startKm)
                            const grad = (() => {
                              const sp = parcoursData?.elevationProfile.find(p => p.distKm >= sb.startKm)
                              const ep = parcoursData?.elevationProfile.find(p => p.distKm >= sb.endKm)
                              return sp && ep && dist > 0 ? ((ep.ele - sp.ele) / (dist * 1000)) * 100 : 0
                            })()
                            return { ...sb, watts: newWatts, estimatedMin: estimateTimeOnSegment(dist, grad, newWatts, athleteWeight, bikeWeight) }
                          }))
                        } else {
                          // EF segment — update global efWatts
                          setEfWatts(newWatts)
                        }
                      }}
                      drawModeActive={drawModeActive}
                      onBlockDraw={(startKm, endKm, anchorPct) => {
                        const pb_ftp = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250
                        const defaultW = Math.round(pb_ftp * 0.90)
                        setPendingWatts(defaultW)
                        setPendingHr(wattToFc(defaultW, pb_ftp, athleteData?.lthrBike ?? athleteData?.lthrRun ?? 170))
                        setPendingBlock({ startKm, endKm, anchorPct })
                      }}
                      onGaugeEdgeChange={(bidx, edge, newKm) => {
                        if (bidx <= -2000) {
                          const si = -(bidx + 2000)
                          setSpecificBlocks(prev => prev.map((sb, i) => {
                            if (i !== si) return sb
                            const newStart = edge === 'start' ? Math.min(newKm, sb.endKm - 0.1) : sb.startKm
                            const newEnd   = edge === 'end'   ? Math.max(newKm, sb.startKm + 0.1) : sb.endKm
                            const dist = Math.max(0.1, newEnd - newStart)
                            const grad = (() => {
                              const sp = parcoursData?.elevationProfile.find(p => p.distKm >= newStart)
                              const ep = parcoursData?.elevationProfile.find(p => p.distKm >= newEnd)
                              return sp && ep && dist > 0 ? ((ep.ele - sp.ele) / (dist * 1000)) * 100 : 0
                            })()
                            const mins = estimateTimeOnSegment(dist, grad, sb.watts, athleteWeight, bikeWeight)
                            return { ...sb, startKm: newStart, endKm: newEnd, estimatedMin: mins }
                          }))
                        }
                      }}
                      onGaugeAction={(bidx, action) => {
                        if (action === 'intervals') {
                          if (bidx >= 0) {
                            // Climb — find ci by segIdx
                            const ci = climbConfigs.findIndex(c => c.segIdx === bidx)
                            if (ci >= 0) setOpenIntervals(prev => ({ ...prev, [`c_${ci}`]: true }))
                          } else if (bidx <= -2000) {
                            // Specific block
                            const si = -(bidx + 2000)
                            const sb = specificBlocks[si]
                            if (sb) setOpenIntervals(prev => ({ ...prev, [sb.id]: true }))
                          }
                        }
                        // 'modify' — just close tooltip (already handled in ElevationChart)
                      }}
                      onBlockEdgeDrag={aiFlowStep === 'parcours' ? undefined : (blockIdx, edge, newKm) => {
                        setBlocks(prev => prev.map((b, i) => {
                          if (i !== blockIdx) return b
                          const updated = { ...b }
                          if (edge === 'start') updated._startKm = newKm
                          else updated._endKm = newKm
                          // Recalculate duration if FTP available
                          if (athleteData?.ftp && updated._startKm != null && updated._endKm != null) {
                            const distKm = Math.abs(updated._endKm - updated._startKm)
                            // approximate gradient from elevation profile
                            const startPt = parcoursData?.elevationProfile?.find(p => p.distKm >= updated._startKm!)
                            const endPt = parcoursData?.elevationProfile?.find(p => p.distKm >= updated._endKm!)
                            const grad = startPt && endPt && distKm > 0
                              ? ((endPt.ele - startPt.ele) / (distKm * 1000)) * 100
                              : 0
                            const watts = parseFloat(updated.value) || athleteData.ftp * 0.75
                            const mins = estimateTimeOnSegment(distKm, grad, watts, athleteWeight, bikeWeight)
                            updated.durationMin = Math.max(1, Math.round(mins))
                          }
                          return updated
                        }))
                      }}
                    />
                    {sport === 'bike' && athleteData?.ftp && (
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={generateBlocksFromTerrain}
                          disabled={terrainLoading}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 8, border: `1px solid ${accent}40`,
                            background: `${accent}12`, color: accent,
                            fontSize: 11, fontWeight: 700, cursor: terrainLoading ? 'not-allowed' : 'pointer',
                            opacity: terrainLoading ? 0.6 : 1,
                          }}
                        >
                          {terrainLoading ? '…' : '⛰ Planifier depuis le parcours'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ZONE WHEEL + CARB ESTIMATE — sous le graphique parcours */}
        {sport === 'bike' && parcoursData && (() => {
          const ftp  = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250
          const lthr = athleteData?.lthrBike ?? athleteData?.lthrRun ?? null
          const totalMin = parseDurationToMin(totalDuration)
          const segs = parcoursData.segments ?? []

          // ── W zone time distribution ───────────────────────────
          const wZoneIdx = (w: number): number => {
            const r = w / ftp
            return r > 1.50 ? 6 : r > 1.20 ? 5 : r > 1.05 ? 4 : r > 0.87 ? 3 : r > 0.75 ? 2 : r > 0.55 ? 1 : 0
          }
          const zoneMinW = new Array(7).fill(0)
          // Always accumulate allocated time (climbs + specific blocks)
          climbConfigs.filter(c => c.selected).forEach(c => {
            const seg = segs[c.segIdx]; if (!seg) return
            const sb = specificBlocks.find(sb => sb.startKm < seg.endKm && sb.endKm > seg.startKm)
            zoneMinW[wZoneIdx(sb ? sb.watts : c.watts)] += sb ? sb.estimatedMin : c.estimatedMin
          })
          specificBlocks.filter(sb => !climbConfigs.some(c => { const s = segs[c.segIdx]; return s && sb.startKm < s.endKm && sb.endKm > s.startKm }))
            .forEach(sb => { zoneMinW[wZoneIdx(sb.watts)] += sb.estimatedMin })
          // Remaining time at EF — use totalMin if set, else estimate from allocated only
          const allocW = zoneMinW.reduce((s, m) => s + m, 0)
          const effectiveTotalMin = totalMin > 0 ? totalMin : allocW  // show even without duration
          if (totalMin > 0) zoneMinW[wZoneIdx(efWatts)] += Math.max(0, totalMin - allocW)
          else if (allocW === 0) zoneMinW[wZoneIdx(efWatts)] = 1  // placeholder so Z2 lights up
          const zonePctW = zoneMinW.map(m => effectiveTotalMin > 0 ? Math.round(m / effectiveTotalMin * 100) : 0)

          // ── SVG wheel renderer (size-aware) ───────────────────
          type ZoneDef = { label: string; name: string; c: string; lo: number; hi: number | null }

          const renderWheel = (zones: ZoneDef[], pcts: number[], unit: string, sz: number) => {
            const N   = zones.length
            const slA = (2 * Math.PI) / N
            const R   = sz * 0.43   // outer radius
            const RI  = sz * 0.14   // inner hole
            const CW  = sz, CH = sz, cx = sz / 2, cy = sz / 2
            const secP = (r: number, sa: number, ea: number) => {
              const g = 0.045; const a1 = sa + g, a2 = ea - g
              const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
              const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
              return `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r},0,${a2 - a1 > Math.PI ? 1 : 0},1,${x2.toFixed(2)},${y2.toFixed(2)} Z`
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8 }}>
                <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ overflow: 'visible' as const }}>
                  <circle cx={cx} cy={cy} r={R} fill="var(--bg-card2)" opacity={0.35} />
                  {zones.map((z, i) => {
                    const sa   = -Math.PI / 2 + i * slA
                    const ea   = sa + slA
                    const pct  = pcts[i] ?? 0
                    const fillR = pct > 0 ? Math.max(RI + sz * 0.05, RI + (R - RI) * Math.sqrt(pct / 100)) : 0
                    const midA = (sa + ea) / 2
                    const lOx  = cx + R * 0.73 * Math.cos(midA)
                    const lOy  = cy + R * 0.73 * Math.sin(midA)
                    const lIx  = cx + R * 0.47 * Math.cos(midA)
                    const lIy  = cy + R * 0.47 * Math.sin(midA)
                    const fSz  = sz >= 160 ? 8 : 6.5
                    return (
                      <g key={i}>
                        <path d={secP(R, sa, ea)} fill={z.c} opacity={0.13} />
                        {fillR > RI && <path d={secP(fillR, sa, ea)} fill={z.c} opacity={0.78} />}
                        <text x={lOx.toFixed(1)} y={(lOy + fSz * 0.45).toFixed(1)} textAnchor="middle" fontSize={fSz} fontWeight={700} fill={pct > 0 ? z.c : 'var(--text-dim)'} fontFamily="DM Mono,monospace">{z.label}</text>
                        {pct > 0 && <text x={lIx.toFixed(1)} y={(lIy + fSz * 0.4).toFixed(1)} textAnchor="middle" fontSize={fSz * 0.88} fontWeight={600} fill={z.c} fontFamily="DM Mono,monospace">{pct}%</text>}
                      </g>
                    )
                  })}
                  <circle cx={cx} cy={cy} r={RI} fill="var(--bg-card)" />
                  <text x={cx} y={cy + sz * 0.025} textAnchor="middle" fontSize={sz >= 160 ? 9 : 7.5} fontWeight={800} fill="var(--text-dim)" fontFamily="DM Mono,monospace">{unit}</text>
                </svg>
                {/* Legend */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 6px', width: '100%' }}>
                  {zones.map((z, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 2, background: z.c, opacity: (pcts[i] ?? 0) > 0 ? 1 : 0.25, flexShrink: 0 }} />
                      <span style={{ fontSize: 7.5, color: (pcts[i] ?? 0) > 0 ? 'var(--text)' : 'var(--text-dim)', fontFamily: 'DM Mono,monospace', whiteSpace: 'nowrap' as const }}>
                        {z.label} {z.lo}{z.hi != null ? `–${z.hi}` : '+'}{unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          const ZONES_W: ZoneDef[] = [
            { label:'Z1', name:'Récup',     c:'#9ca3af', lo:0,                          hi:Math.round(ftp*0.55) },
            { label:'Z2', name:'Endurance', c:'#22c55e', lo:Math.round(ftp*0.55), hi:Math.round(ftp*0.75) },
            { label:'Z3', name:'Tempo',     c:'#eab308', lo:Math.round(ftp*0.75), hi:Math.round(ftp*0.87) },
            { label:'Z4', name:'Seuil',     c:'#f97316', lo:Math.round(ftp*0.87), hi:Math.round(ftp*1.05) },
            { label:'Z5', name:'VO2max',    c:'#ef4444', lo:Math.round(ftp*1.05), hi:Math.round(ftp*1.20) },
            { label:'Z6', name:'Anaérobie', c:'#991B1B', lo:Math.round(ftp*1.20), hi:Math.round(ftp*1.50) },
            { label:'Z7', name:'Sprint',    c:'#6B21A8', lo:Math.round(ftp*1.50), hi:null },
          ]
          const lthrVal = lthr ?? 170  // default 170 bpm if no LTHR set
          const ZONES_FC: ZoneDef[] = [
            { label:'Z1', name:'Récup',     c:'#9ca3af', lo:0,                               hi:Math.round(lthrVal*0.80) },
            { label:'Z2', name:'Endurance', c:'#22c55e', lo:Math.round(lthrVal*0.80), hi:Math.round(lthrVal*0.89) },
            { label:'Z3', name:'Tempo',     c:'#eab308', lo:Math.round(lthrVal*0.89), hi:Math.round(lthrVal*0.95) },
            { label:'Z4', name:'Seuil',     c:'#f97316', lo:Math.round(lthrVal*0.95), hi:Math.round(lthrVal*1.02) },
            { label:'Z5', name:'VO2max',    c:'#ef4444', lo:Math.round(lthrVal*1.02), hi:null },
          ]

          // ── FC zone time distribution ──────────────────────────
          const fcZoneIdx = (hr: number): number => {
            const r = hr / lthrVal
            return r >= 1.02 ? 4 : r >= 0.95 ? 3 : r >= 0.89 ? 2 : r >= 0.80 ? 1 : 0
          }
          const zoneMinFC = new Array(5).fill(0)
          // Climbs
          climbConfigs.filter(c => c.selected).forEach(c => {
            const sb = specificBlocks.find(sb => { const s = segs[c.segIdx]; return s && sb.startKm < s.endKm && sb.endKm > s.startKm })
            const hr = sb ? (sb.hrAvg ?? wattToFc(sb.watts, ftp, lthrVal)) : (c.hrAvg ?? wattToFc(c.watts, ftp, lthrVal))
            const mins = sb ? sb.estimatedMin : c.estimatedMin
            zoneMinFC[fcZoneIdx(hr)] += mins
          })
          // Standalone specific blocks (not overlapping a climb)
          specificBlocks.filter(sb => !climbConfigs.some(c => { const s = segs[c.segIdx]; return s && sb.startKm < s.endKm && sb.endKm > s.startKm }))
            .forEach(sb => { zoneMinFC[fcZoneIdx(sb.hrAvg ?? wattToFc(sb.watts, ftp, lthrVal))] += sb.estimatedMin })
          // EF remainder
          const allocFC = zoneMinFC.reduce((s, m) => s + m, 0)
          const effectiveTotalMinFC = totalMin > 0 ? totalMin : allocFC
          if (totalMin > 0) {
            const efHrVal = efHr > 0 ? efHr : wattToFc(efWatts, ftp, lthrVal)
            zoneMinFC[fcZoneIdx(efHrVal)] += Math.max(0, totalMin - allocFC)
          } else if (allocFC === 0) {
            zoneMinFC[fcZoneIdx(wattToFc(efWatts, ftp, lthrVal))] = 1
          }
          const zonePctFC = zoneMinFC.map(m => effectiveTotalMinFC > 0 ? Math.round(m / effectiveTotalMinFC * 100) : 0)

          // ── Carb estimation ───────────────────────────────────
          const carbEst = (() => {
            const h = effectiveTotalMin / 60
            if (h < 0.25) return null
            const tssR = computeParcoursFlowTSS()
            const ifVal = tssR?.ifVal ?? 0.72
            const loGh = ifVal >= 0.95 ? 80 : ifVal >= 0.85 ? 70 : ifVal >= 0.75 ? 60 : 50
            const hiGh = ifVal >= 0.95 ? 100 : ifVal >= 0.85 ? 90 : ifVal >= 0.75 ? 80 : 65
            return { lo: Math.round(loGh * h), hi: Math.round(hiGh * h), loGh, hiGh, h }
          })()

          const wheelSz = mobile ? 160 : 190

          return (
            <div style={{ margin: mobile ? '10px 16px 0' : '10px 24px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '14px 16px' }}>
              {/* Wheels row — W centré côté gauche, FC centré côté droit, même taille */}
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {/* Moitié gauche — W */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                  {renderWheel(ZONES_W, zonePctW, 'W', wheelSz)}
                </div>
                {/* Moitié droite — FC */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                  {renderWheel(ZONES_FC, zonePctFC, 'FC', wheelSz)}
                </div>
              </div>
              {/* Carb estimate + avg power + avg FC — sous les deux cercles */}
              {(() => {
                const _ftpA  = ftp
                const _lthrA = lthrVal
                // Average power (time-weighted)
                const tssR = computeParcoursFlowTSS()
                const avgPower = tssR ? tssR.np : (() => {
                  let wSum = 0, tSum = 0
                  climbConfigs.filter(c => c.selected).forEach(c => { wSum += c.watts * c.estimatedMin; tSum += c.estimatedMin })
                  specificBlocks.forEach(sb => { wSum += sb.watts * sb.estimatedMin; tSum += sb.estimatedMin })
                  const totalMin = parseDurationToMin(totalDuration)
                  const remaining = Math.max(0, totalMin - tSum)
                  wSum += efWatts * remaining; tSum += remaining
                  return tSum > 0 ? Math.round(wSum / tSum) : efWatts
                })()
                // Average FC (time-weighted)
                const avgFc = (() => {
                  let hSum = 0, tSum = 0
                  climbConfigs.filter(c => c.selected).forEach(c => {
                    const sb = specificBlocks.find(sb => { const s = segs[c.segIdx]; return s && sb.startKm < s.endKm && sb.endKm > s.startKm })
                    const hr = sb ? (sb.hrAvg ?? wattToFc(sb.watts, _ftpA, _lthrA)) : (c.hrAvg ?? wattToFc(c.watts, _ftpA, _lthrA))
                    const mins = sb ? sb.estimatedMin : c.estimatedMin
                    hSum += hr * mins; tSum += mins
                  })
                  specificBlocks.filter(sb => !climbConfigs.some(c => { const s = segs[c.segIdx]; return s && sb.startKm < s.endKm && sb.endKm > s.startKm }))
                    .forEach(sb => { hSum += (sb.hrAvg ?? wattToFc(sb.watts, _ftpA, _lthrA)) * sb.estimatedMin; tSum += sb.estimatedMin })
                  const totalMin = parseDurationToMin(totalDuration)
                  const remaining = Math.max(0, totalMin - tSum)
                  const efHrVal = efHr > 0 ? efHr : wattToFc(efWatts, _ftpA, _lthrA)
                  hSum += efHrVal * remaining; tSum += remaining
                  return tSum > 0 ? Math.round(hSum / tSum) : efHrVal
                })()
                return (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
                    {carbEst && (
                      <>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>🍯 Glucides</span>
                        <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: accent }}>{carbEst.lo}–{carbEst.hi}g</span>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{carbEst.loGh}–{carbEst.hiGh}g/h</span>
                        <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
                      </>
                    )}
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>⚡ Moy.</span>
                    <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: 'var(--text)' }}>{avgPower}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginLeft: 2 }}>W</span></span>
                    <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>❤️ FC moy.</span>
                    <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: '#ef4444' }}>{avgFc}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginLeft: 2 }}>bpm</span></span>
                  </div>
                )
              })()}
            </div>
          )
        })()}

        {/* SÉPARATEUR 2 — entre Description et Construction */}
        <div style={{ height: 1, background: 'var(--border)', margin: mobile ? '12px 16px' : '16px 24px', opacity: 0.5 }} />

        {/* CONSTRUCTEUR */}
        <div style={{ padding: mobile ? '24px 16px 24px' : '24px 24px 24px' }}>
          {!parcoursData && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={lbl}>Construction de la séance</span>
              <div style={{ display: 'flex', gap: 0, background: 'var(--bg-card)', borderRadius: 7, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <button onClick={() => setBuilderTab('manual')} style={{
                  padding: '6px 14px', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: builderTab === 'manual' ? `${accent}18` : 'transparent',
                  color: builderTab === 'manual' ? accent : 'var(--text-dim)',
                }}>Manuel</button>
                <button onClick={() => setBuilderTab('ai')} style={{
                  padding: '6px 14px', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: builderTab === 'ai' ? `${accent}18` : 'transparent',
                  color: builderTab === 'ai' ? accent : 'var(--text-dim)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 11 }}>✦</span> IA
                </button>
              </div>
            </div>
          )}

          {builderTab === 'manual' && !parcoursData ? (
            isStrength && !isEdit && blocks.length === 0 ? (
              /* Mode création manuel : constructeur par exercices (circuits) */
              <ExerciseListBuilder
                sport={sport}
                exercises={exercises}
                onChange={setExercises}
                onCircuitsChange={(c, m) => { gymCircuitsRef.current = c; gymCircuitMapRef.current = m }}
              />
            ) : (
              /* Mode IA ou edit : blocs générés (avec circuit_headers) */
              <BlockBuilder sport={sport} blocks={blocks} onChange={setBlocks} nutritionItems={nutritionItems} exoHistory={exoHistory} athleteData={athleteData} />
            )
          ) : (
            (() => {
              const hasClimbs = (parcoursData?.segments ?? []).some(s => s.type === 'climb')
              const ftp = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 200
              const segs = parcoursData?.segments ?? []
              const effectiveStep: AIFlowStep = !hasClimbs ? 'free' : aiFlowStep

              function zoneColor(w: number): string {
                const r = w / ftp
                if (r > 1.50) return '#6B21A8'  // Z7 Sprint
                if (r > 1.20) return '#991B1B'  // Z6 Anaérobie
                if (r > 1.05) return '#ef4444'  // Z5 VO2max
                if (r > 0.87) return '#f97316'  // Z4 Seuil
                if (r > 0.75) return '#eab308'  // Z3 Tempo
                if (r > 0.55) return '#22c55e'  // Z2 Endurance
                return '#9ca3af'                 // Z1 Récup
              }
              function zoneLabel(w: number): string {
                const r = w / ftp
                if (r > 1.50) return 'Z7'
                if (r > 1.20) return 'Z6'
                if (r > 1.05) return 'Z5'
                if (r > 0.87) return 'Z4'
                if (r > 0.75) return 'Z3'
                if (r > 0.55) return 'Z2'
                return 'Z1'
              }

              // ── STEP ASK ──────────────────────────────────────
              if (effectiveStep === 'ask') {
                const climbs = segs.filter(s => s.type === 'climb')
                return (
                  <div style={{ borderRadius: 12, border: `1px solid ${accent}20`, background: `${accent}05`, padding: 18 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: '#fff' }}>✦</div>
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', flex: 1 }}>
                        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5, fontWeight: 500 }}>
                          Souhaites-tu construire ta séance en tenant compte du profil de ce parcours ?
                        </p>
                        <p style={{ margin: '0 0 3px', fontSize: 11, color: accent, fontWeight: 700 }}>{parcoursData?.name}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-dim)' }}>
                          {[parcoursData?.distance ? `${parcoursData.distance} km` : '', parcoursData?.elevation ? `${parcoursData.elevation} m D+` : '', `${climbs.length} montée${climbs.length > 1 ? 's' : ''} détectée${climbs.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { initClimbConfigs(); setAiFlowStep('parcours') }} style={{
                        flex: 2, padding: '10px 16px', borderRadius: 9, border: 'none',
                        background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                      }}>⛰ Oui, intégrer le parcours</button>
                      <button onClick={() => setAiFlowStep('free')} style={{
                        flex: 1, padding: '10px 16px', borderRadius: 9,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>Texte libre</button>
                    </div>
                  </div>
                )
              }

              // ── STEP PARCOURS CONFIG ──────────────────────────
              if (effectiveStep === 'parcours') {
                const tssResult = computeParcoursFlowTSS()
                const totalClimbMin = climbConfigs.filter(c => c.selected).reduce((s, c) => s + c.estimatedMin, 0)
                const totalDurMin   = parseDurationToMin(totalDuration)

                return (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setAiFlowStep('ask')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>←</button>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{parcoursData?.name}</span>
                      {parcoursData?.distance && <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>{parcoursData.distance} km</span>}
                    </div>

                    {/* Durée totale prévue (requis pour TSS) */}
                    <div style={{ borderRadius: 10, border: `1px solid ${accent}30`, background: `${accent}06`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, position: 'relative' as const }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Durée prévue de la sortie</div>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Heures · minutes · nécessaire pour le TSS</div>
                      </div>
                      <button
                        onClick={() => setShowDurPicker(v => !v)}
                        style={{ minWidth: 64, padding: '5px 10px', borderRadius: 6, border: `1px solid ${accent}50`, background: 'var(--bg-card2)', color: totalDuration ? 'var(--text)' : 'var(--text-dim)', fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', cursor: 'pointer', textAlign: 'center' as const }}
                      >{totalDuration || '—:——'}</button>
                      {showDurPicker && (() => {
                        const parts = totalDuration.split(':')
                        const curH = parseInt(parts[0]) || 0
                        const curM = parseInt(parts[1]) || 0
                        const hours = Array.from({ length: 13 }, (_, i) => i)
                        const mins  = Array.from({ length: 12 }, (_, i) => i * 5)
                        return (
                          <div style={{ position: 'absolute' as const, right: 0, top: '100%', marginTop: 6, zIndex: 200, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', padding: 12, display: 'flex', gap: 0, minWidth: 180 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textAlign: 'center' as const, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Heures</div>
                              <div style={{ maxHeight: 200, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
                                {hours.map(h => (
                                  <button key={h} onClick={() => { setTotalDuration(`${h}:${String(curM).padStart(2, '0')}`); setDur(h * 60 + curM); setShowDurPicker(false) }} style={{ padding: '6px 8px', borderRadius: 7, border: 'none', background: curH === h ? `${accent}22` : 'transparent', color: curH === h ? accent : 'var(--text)', fontSize: 13, fontWeight: curH === h ? 800 : 500, fontFamily: 'DM Mono, monospace', cursor: 'pointer', textAlign: 'center' as const }}>{h}h</button>
                                ))}
                              </div>
                            </div>
                            <div style={{ width: 1, background: 'var(--border)', margin: '0 8px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textAlign: 'center' as const, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Minutes</div>
                              <div style={{ maxHeight: 200, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
                                {mins.map(m => (
                                  <button key={m} onClick={() => { setTotalDuration(`${curH}:${String(m).padStart(2, '0')}`); setDur(curH * 60 + m); setShowDurPicker(false) }} style={{ padding: '6px 8px', borderRadius: 7, border: 'none', background: curM === m ? `${accent}22` : 'transparent', color: curM === m ? accent : 'var(--text)', fontSize: 13, fontWeight: curM === m ? 800 : 500, fontFamily: 'DM Mono, monospace', cursor: 'pointer', textAlign: 'center' as const }}>{String(m).padStart(2, '0')}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Bulk power apply — toujours visible, applique à toutes les côtes */}
                    {blocks.length === 0 && climbConfigs.length > 0 && (() => {
                      const bFtp  = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250
                      const bLthr = athleteData?.lthrBike ?? athleteData?.lthrRun ?? 170
                      const displayHr = bulkHr > 0 ? bulkHr : wattToFc(bulkWatts, bFtp, bLthr)
                      return (
                        <div style={{ borderRadius: 10, border: `1px solid ${accent}30`, background: `${accent}06`, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>⚡ Même puissance pour toutes les côtes</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <LocalInput
                                value={bulkWatts}
                                min={50} max={600}
                                onCommit={w => { setBulkWatts(w); setBulkHr(wattToFc(w, bFtp, bLthr)) }}
                                style={{ width: 60, padding: '5px 7px', borderRadius: 6, border: `1px solid ${accent}50`, background: 'var(--bg-card2)', color: accent, fontSize: 14, fontWeight: 800, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                              />
                              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>W</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <LocalInput
                                value={displayHr}
                                min={60} max={220}
                                onCommit={hr => setBulkHr(hr)}
                                style={{ width: 52, padding: '5px 7px', borderRadius: 6, border: '1px solid #ef444450', background: 'var(--bg-card2)', color: '#ef4444', fontSize: 13, fontWeight: 800, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                              />
                              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>bpm</span>
                            </div>
                            <div style={{ flex: 1 }} />
                            <button
                              onClick={() => {
                                const applyHr = bulkHr > 0 ? bulkHr : wattToFc(bulkWatts, bFtp, bLthr)
                                setClimbConfigs(prev => prev.map(c => {
                                  const seg = (parcoursData?.segments ?? [])[c.segIdx]
                                  const mins = seg ? estimateTimeOnSegment(seg.distanceKm, seg.avgGradient, bulkWatts, athleteWeight, bikeWeight) : c.estimatedMin
                                  return { ...c, watts: bulkWatts, hrAvg: applyHr, estimatedMin: mins }
                                }))
                              }}
                              style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                            >Appliquer à toutes</button>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Climb cards — masquées après génération */}
                    {blocks.length === 0 && climbConfigs.map((cfg, ci) => {
                      const seg = segs[cfg.segIdx]
                      if (!seg) return null
                      const timeMin = cfg.estimatedMin
                      const warnOverFtp = cfg.selected && cfg.watts > ftp && timeMin > 20
                      const zc = zoneColor(cfg.watts)
                      const overrideBlock = specificBlocks.find(sb =>
                        sb.startKm < seg.endKm && sb.endKm > seg.startKm
                      )
                      return (
                        <div key={ci} style={{
                          borderRadius: 10, border: `1px solid ${cfg.selected ? `${zc}40` : 'var(--border)'}`,
                          background: cfg.selected ? `${zc}07` : 'var(--bg-card)', overflow: 'hidden',
                        }}>
                          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9 }}>
                            {/* Checkbox */}
                            <button
                              onClick={() => setClimbConfigs(prev => prev.map((c, i) => i === ci ? { ...c, selected: !c.selected } : c))}
                              style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${cfg.selected ? zc : 'var(--border)'}`, background: cfg.selected ? zc : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                              {cfg.selected && <span style={{ fontSize: 10, color: '#fff', lineHeight: 1 }}>✓</span>}
                            </button>
                            {/* Accent bar */}
                            <div style={{ width: 3, height: 36, borderRadius: 2, background: cfg.selected ? zc : 'var(--border)', flexShrink: 0 }} />
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                Côte {ci + 1}
                                <span style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 10 }}>km {seg.startKm}→{seg.endKm}</span>
                                {overrideBlock && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.12)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>OVERRIDE</span>
                                )}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', flexWrap: 'wrap' as const, gap: '0 6px' }}>
                                <span>{seg.distanceKm} km</span>
                                <span>·</span>
                                <span>{seg.avgGradient}%</span>
                                <span>·</span>
                                <span>D+{seg.elevationDeltaM}m</span>
                                <span>·</span>
                                <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text)', fontWeight: 600 }}>
                                  {overrideBlock ? overrideBlock.estimatedMin.toFixed(0) : timeMin.toFixed(0)} min
                                </span>
                                {cfg.selected && (
                                  <>
                                    <span>·</span>
                                    <span style={{ fontFamily: 'DM Mono, monospace', color: '#ef4444', fontWeight: 700 }}>
                                      {cfg.hrAvg ?? wattToFc(cfg.watts, trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250, athleteData?.lthrBike ?? athleteData?.lthrRun ?? 170)} bpm
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Watts + FC inputs — toujours visibles, grisées si non sélectionnée */}
                            {(() => {
                              const curFtp  = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250
                              const curLthr = athleteData?.lthrBike ?? athleteData?.lthrRun ?? 170
                              const disabled = !cfg.selected || !!overrideBlock
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 3, flexShrink: 0, opacity: disabled ? 0.35 : 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <LocalInput
                                      value={overrideBlock ? overrideBlock.watts : cfg.watts}
                                      min={50} max={600}
                                      onCommit={w => {
                                        if (disabled) return
                                        const mins = estimateTimeOnSegment(seg.distanceKm, seg.avgGradient, w, athleteWeight, bikeWeight)
                                        const hr = wattToFc(w, curFtp, curLthr)
                                        setClimbConfigs(prev => prev.map((c, i) => i === ci ? { ...c, watts: w, hrAvg: hr, estimatedMin: mins } : c))
                                      }}
                                      style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: `1px solid ${overrideBlock ? '#f97316' : zc}60`, background: 'var(--bg-card2)', color: overrideBlock ? '#f97316' : zc, fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none', cursor: disabled ? 'default' : 'text' }}
                                    />
                                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>W</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <LocalInput
                                      value={cfg.hrAvg ?? wattToFc(cfg.watts, curFtp, curLthr)}
                                      min={60} max={220}
                                      onCommit={hr => {
                                        if (disabled) return
                                        setClimbConfigs(prev => prev.map((c, i) => i === ci ? { ...c, hrAvg: hr } : c))
                                      }}
                                      style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: '#ef4444', fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none', cursor: disabled ? 'default' : 'text' }}
                                    />
                                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>bpm</span>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                          {/* Intervalles button */}
                          {cfg.selected && !overrideBlock && (
                            <button
                              onClick={() => setOpenIntervals(prev => ({ ...prev, [`c_${ci}`]: !prev[`c_${ci}`] }))}
                              style={{ margin:'6px 12px 0', padding:'4px 10px', borderRadius:6, border:`1px solid ${zc}40`, background:openIntervals[`c_${ci}`]?`${zc}20`:`${zc}08`, color:zc, fontSize:9, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                              <span>⚡</span>
                              <span>{cfg.intervals ? `${cfg.intervals.reps}×(${cfg.intervals.blocks.length} blocs)` : 'Intervalles'}</span>
                              <span style={{ opacity:0.6 }}>{openIntervals[`c_${ci}`] ? '▲' : '▼'}</span>
                            </button>
                          )}
                          {openIntervals[`c_${ci}`] && cfg.selected && !overrideBlock && (
                            <IntervalPanel
                              blockDurationMin={cfg.estimatedMin}
                              defaultWatts={cfg.watts}
                              ftp={trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250}
                              value={cfg.intervals ?? null}
                              onChange={iv => setClimbConfigs(prev => prev.map((c,i) => i===ci ? {...c, intervals: iv ?? undefined} : c))}
                              onClose={() => setOpenIntervals(prev => ({...prev,[`c_${ci}`]:false}))}
                            />
                          )}
                          {/* FTP warning */}
                          {warnOverFtp && !overrideBlock && (
                            <div style={{ padding: '5px 12px', background: 'rgba(234,179,8,0.10)', borderTop: '1px solid rgba(234,179,8,0.25)', fontSize: 10, color: '#ca8a04', display: 'flex', gap: 5, alignItems: 'center' }}>
                              <span>⚠</span>
                              <span>{cfg.watts}W &gt; FTP ({ftp}W) sur {timeMin.toFixed(0)} min — intensité non soutenable.</span>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* EF intensity (plats + descentes) */}
                    {(() => {
                      const efFtp = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250
                      const efLthr = athleteData?.lthrBike ?? athleteData?.lthrRun ?? 170
                      return (
                        <div style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Plats & descentes</div>
                            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                              Endurance de fond — Z{efWatts / efFtp < 0.56 ? 1 : efWatts / efFtp < 0.76 ? 2 : efWatts / efFtp < 0.90 ? 3 : 4} ({Math.round((efWatts / efFtp) * 100)}% FTP)
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <LocalInput
                                value={efWatts}
                                min={50} max={600}
                                onCommit={w => { setEfWatts(w); setEfHr(wattToFc(w, efFtp, efLthr)) }}
                                style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                              />
                              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>W</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <LocalInput
                                value={efHr > 0 ? efHr : wattToFc(efWatts, efFtp, efLthr)}
                                min={60} max={220}
                                onCommit={setEfHr}
                                style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: '#ef4444', fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                              />
                              <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>bpm</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* ── Blocs spécifiques ─────────────────────── */}
                    <div style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Blocs spécifiques</div>
                          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Km début→fin, watts cibles, HR optionnel</div>
                        </div>
                        <button
                          onClick={() => {
                            const newId = `sb_${Date.now()}`
                            const defaultStart = parcoursData?.distance ? Math.round(parcoursData.distance * 0.3 * 10) / 10 : 0
                            const defaultEnd   = parcoursData?.distance ? Math.round(parcoursData.distance * 0.5 * 10) / 10 : 10
                            const defaultW     = Math.round(ftp * 0.90)
                            const dist         = Math.max(0.1, defaultEnd - defaultStart)
                            const gradInit = (() => {
                              const sp = parcoursData?.elevationProfile.find(p => p.distKm >= defaultStart)
                              const ep = parcoursData?.elevationProfile.find(p => p.distKm >= defaultEnd)
                              return sp && ep && dist > 0 ? ((ep.ele - sp.ele) / (dist * 1000)) * 100 : 0
                            })()
                            const mins         = estimateTimeOnSegment(dist, gradInit, defaultW, athleteWeight, bikeWeight)
                            setSpecificBlocks(prev => [...prev, { id: newId, startKm: defaultStart, endKm: defaultEnd, watts: defaultW, estimatedMin: mins }])
                          }}
                          style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${accent}40`, background: `${accent}10`, color: accent, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >+ Ajouter</button>
                      </div>
                      {specificBlocks.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {specificBlocks.map((sb) => (
                            <div key={sb.id} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {/* km début */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1 }}>
                                  <span style={{ fontSize: 9, color: 'var(--text-dim)', width: 24 }}>km</span>
                                  <LocalInput
                                    value={sb.startKm}
                                    min={0}
                                    max={parcoursData?.distance ?? 9999}
                                    step={0.1}
                                    onCommit={v => {
                                      const dist = Math.max(0.1, sb.endKm - v)
                                      const grad = (() => {
                                        const sp = parcoursData?.elevationProfile.find(p => p.distKm >= v)
                                        const ep = parcoursData?.elevationProfile.find(p => p.distKm >= sb.endKm)
                                        return sp && ep && dist > 0 ? ((ep.ele - sp.ele) / (dist * 1000)) * 100 : 0
                                      })()
                                      const mins = estimateTimeOnSegment(dist, grad, sb.watts, athleteWeight, bikeWeight)
                                      setSpecificBlocks(prev => prev.map(x => x.id === sb.id ? { ...x, startKm: v, estimatedMin: mins } : x))
                                    }}
                                    style={{ width: 52, padding: '3px 5px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 11, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                                  />
                                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>→</span>
                                  <LocalInput
                                    value={sb.endKm}
                                    min={sb.startKm + 0.1}
                                    max={parcoursData?.distance ?? 9999}
                                    step={0.1}
                                    onCommit={v => {
                                      const dist = Math.max(0.1, v - sb.startKm)
                                      const grad = (() => {
                                        const sp = parcoursData?.elevationProfile.find(p => p.distKm >= sb.startKm)
                                        const ep = parcoursData?.elevationProfile.find(p => p.distKm >= v)
                                        return sp && ep && dist > 0 ? ((ep.ele - sp.ele) / (dist * 1000)) * 100 : 0
                                      })()
                                      const mins = estimateTimeOnSegment(dist, grad, sb.watts, athleteWeight, bikeWeight)
                                      setSpecificBlocks(prev => prev.map(x => x.id === sb.id ? { ...x, endKm: v, estimatedMin: mins } : x))
                                    }}
                                    style={{ width: 52, padding: '3px 5px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 11, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                                  />
                                </div>
                                {/* Watts */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <LocalInput
                                    value={sb.watts}
                                    min={50} max={600}
                                    onCommit={w => {
                                      const dist = Math.max(0.1, sb.endKm - sb.startKm)
                                      const grad = (() => {
                                        const sp = parcoursData?.elevationProfile.find(p => p.distKm >= sb.startKm)
                                        const ep = parcoursData?.elevationProfile.find(p => p.distKm >= sb.endKm)
                                        return sp && ep && dist > 0 ? ((ep.ele - sp.ele) / (dist * 1000)) * 100 : 0
                                      })()
                                      const mins = estimateTimeOnSegment(dist, grad, w, athleteWeight, bikeWeight)
                                      const autoHr = wattToFc(w, trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250, athleteData?.lthrBike ?? athleteData?.lthrRun ?? 170)
                                      setSpecificBlocks(prev => prev.map(x => x.id === sb.id ? { ...x, watts: w, hrAvg: autoHr, estimatedMin: mins } : x))
                                    }}
                                    style={{ width: 52, padding: '3px 5px', borderRadius: 5, border: `1px solid ${zoneColor(sb.watts)}60`, background: 'var(--bg-card2)', color: zoneColor(sb.watts), fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                                  />
                                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>W</span>
                                </div>
                                {/* HR — pre-filled from watts */}
                                {(() => {
                                  const sbFtp = trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250
                                  const sbLthr = athleteData?.lthrBike ?? athleteData?.lthrRun ?? 170
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <LocalInput
                                        value={sb.hrAvg ?? wattToFc(sb.watts, sbFtp, sbLthr)}
                                        min={60} max={220}
                                        onCommit={v => setSpecificBlocks(prev => prev.map(x => x.id === sb.id ? { ...x, hrAvg: v } : x))}
                                        style={{ width: 44, padding: '3px 5px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: '#ef4444', fontSize: 10, fontWeight: 700, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                                      />
                                      <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>bpm</span>
                                    </div>
                                  )
                                })()}
                                <button onClick={() => setSpecificBlocks(prev => prev.filter(x => x.id !== sb.id))}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
                              </div>
                              {/* Intervalles button for specific block */}
                              <button
                                onClick={() => setOpenIntervals(prev => ({ ...prev, [sb.id]: !prev[sb.id] }))}
                                style={{ margin:'2px 0 0', padding:'3px 9px', borderRadius:5, border:`1px solid ${zoneColor(sb.watts)}40`, background:openIntervals[sb.id]?`${zoneColor(sb.watts)}20`:`${zoneColor(sb.watts)}08`, color:zoneColor(sb.watts), fontSize:9, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4, alignSelf:'flex-start' as const }}>
                                <span>⚡</span>
                                <span>{sb.intervals ? `${sb.intervals.reps}×(${sb.intervals.blocks.length} blocs)` : 'Intervalles'}</span>
                                <span style={{ opacity:0.6 }}>{openIntervals[sb.id]?'▲':'▼'}</span>
                              </button>
                              {openIntervals[sb.id] && (
                                <IntervalPanel
                                  blockDurationMin={sb.estimatedMin}
                                  defaultWatts={sb.watts}
                                  ftp={trainingZones.bike.ftp_watts ?? athleteData?.ftp ?? 250}
                                  value={sb.intervals ?? null}
                                  onChange={iv => setSpecificBlocks(prev => prev.map(x => x.id===sb.id ? {...x, intervals: iv ?? undefined} : x))}
                                  onClose={() => setOpenIntervals(prev => ({...prev,[sb.id]:false}))}
                                />
                              )}
                              {/* Durée estimée NR */}
                              <div style={{ fontSize: 10, color: 'var(--text-dim)', paddingLeft: 28 }}>
                                ⏱ ~<strong style={{ color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{sb.estimatedMin.toFixed(0)}</strong> min estimées
                                {specificBlocks.some(x => x.id === sb.id && climbConfigs.some(c => {
                                  const seg = segs[c.segIdx]
                                  return seg && sb.startKm < seg.endKm && sb.endKm > seg.startKm
                                })) && (
                                  <span style={{ marginLeft: 8, color: '#f97316', fontWeight: 700, fontSize: 9 }}>override côte</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* TSS + durée preview */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, borderRadius: 10, border: `1px solid ${tssResult ? accent + '40' : 'var(--border)'}`, background: tssResult ? `${accent}08` : 'var(--bg-card)', padding: '10px 8px', textAlign: 'center' as const }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: tssResult ? accent : 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>{tssResult ? String(tssResult.tss) : '—'}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: 2 }}>
                          {tssResult ? 'TSS' : 'TSS — saisir durée'}
                        </div>
                        {tssResult && (
                          <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginTop: 3 }}>
                            NP {tssResult.np}W · IF {tssResult.ifVal.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '10px 8px', textAlign: 'center' as const }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: totalDurMin > 0 ? 'var(--text)' : 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>
                          {totalDurMin > 0 ? `${Math.floor(totalDurMin / 60)}h${String(totalDurMin % 60).padStart(2, '0')}` : '—'}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: 2 }}>durée totale</div>
                      </div>
                      <div style={{ flex: 1, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '10px 8px', textAlign: 'center' as const }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{Math.round(totalClimbMin)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: 2 }}>min côtes</div>
                      </div>
                    </div>

                    {aiError && (
                      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#ef4444', fontSize: 11, lineHeight: 1.5 }}>
                        {aiError}
                      </div>
                    )}

                    {/* ── Panneau de synthèse post-génération ── */}
                    {blocks.length > 0 && !aiLoading && (() => {
                      const tssResult = computeParcoursFlowTSS()
                      const totalMin  = parseDurationToMin(totalDuration)
                      const total_s   = totalMin * 60

                      // Données côtes sélectionnées
                      const climbRows = climbConfigs
                        .filter(c => c.selected)
                        .map(c => {
                          const seg = segs[c.segIdx]; if (!seg) return null
                          const overSb = specificBlocks.find(sb => sb.startKm < seg.endKm && sb.endKm > seg.startKm)
                          const w   = overSb ? overSb.watts : c.watts
                          const min = overSb ? overSb.estimatedMin : c.estimatedMin
                          const r   = w / ftp
                          const zc  = r > 1.50 ? '#6B21A8' : r > 1.20 ? '#991B1B' : r > 1.05 ? '#ef4444' : r > 0.87 ? '#f97316' : r > 0.75 ? '#eab308' : r > 0.55 ? '#22c55e' : '#9ca3af'
                          const zl  = r > 1.50 ? 'Z7' : r > 1.20 ? 'Z6' : r > 1.05 ? 'Z5' : r > 0.87 ? 'Z4' : r > 0.75 ? 'Z3' : r > 0.55 ? 'Z2' : 'Z1'
                          return { segIdx: c.segIdx, seg, w, min, zc, zl, isOverride: !!overSb }
                        }).filter((x): x is NonNullable<typeof x> => x !== null)

                      // Blocs spécifiques hors côtes
                      const sbRows = specificBlocks.filter(sb =>
                        !climbConfigs.some(c => { const s = segs[c.segIdx]; return s && sb.startKm < s.endKm && sb.endKm > s.startKm })
                      )

                      // Durée allouée côtes + blocs spécifiques
                      const allocatedS = [...climbRows.map(r => r.min * 60), ...sbRows.map(s => s.estimatedMin * 60)].reduce((a, b) => a + b, 0)
                      const remainingS = Math.max(0, total_s - allocatedS)

                      // Puissance moyenne pondérée
                      const allW: Array<{ watts: number; dur_s: number }> = [
                        ...climbRows.map(r => ({ watts: r.w, dur_s: r.min * 60 })),
                        ...sbRows.map(s => ({ watts: s.watts, dur_s: s.estimatedMin * 60 })),
                        ...(remainingS > 0 ? [{ watts: efWatts, dur_s: remainingS }] : []),
                      ]
                      const totalWS = allW.reduce((s, x) => s + x.dur_s, 0)
                      const avgW    = totalWS > 0 ? Math.round(allW.reduce((s, x) => s + x.watts * x.dur_s, 0) / totalWS) : 0
                      // Kcal cycling: W × s / 4184 / 0.25 * 1000 (kJ path)
                      const kcal    = Math.round(allW.reduce((s, x) => s + (x.watts * x.dur_s) / 1000 * 3.6 / 0.25, 0))
                      const totalClimbS = climbRows.reduce((s, r) => s + r.min * 60, 0)

                      return (
                        <div style={{ borderRadius: 12, border: `1px solid ${accent}30`, background: `${accent}06`, padding: 14, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                          {/* Title */}
                          <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Résumé séance</div>

                          {/* Côtes */}
                          {climbRows.map((r, i) => (
                            <div key={r.segIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--bg-card)', border: `1px solid ${r.zc}30` }}>
                              <div style={{ width: 3, height: 32, borderRadius: 2, background: r.zc, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                  Côte {i + 1} · km{r.seg.startKm}→{r.seg.endKm}
                                </div>
                                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>{r.min.toFixed(0)} min · {r.zl}</div>
                              </div>
                              <LocalInput
                                value={r.w}
                                min={50} max={600}
                                onCommit={newW => {
                                  const mins = estimateTimeOnSegment(r.seg.distanceKm, r.seg.avgGradient, newW, athleteWeight, bikeWeight)
                                  setClimbConfigs(prev => prev.map(c => c.segIdx === r.segIdx ? { ...c, watts: newW, estimatedMin: mins } : c))
                                }}
                                style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: `1px solid ${r.zc}50`, background: 'var(--bg-card2)', color: r.zc, fontSize: 12, fontWeight: 800, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                              />
                              <span style={{ fontSize: 9, color: 'var(--text-dim)', flexShrink: 0 }}>W</span>
                            </div>
                          ))}

                          {/* Blocs spécifiques */}
                          {sbRows.map((sb, i) => {
                            const r = sb.watts / ftp
                            const zc = r > 1.50 ? '#6B21A8' : r > 1.20 ? '#991B1B' : r > 1.05 ? '#ef4444' : r > 0.87 ? '#f97316' : r > 0.75 ? '#eab308' : r > 0.55 ? '#22c55e' : '#9ca3af'
                            return (
                              <div key={sb.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid rgba(249,115,22,0.25)' }}>
                                <div style={{ width: 3, height: 32, borderRadius: 2, background: '#f97316', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                    Bloc {i + 1} · km{sb.startKm}→{sb.endKm}
                                  </div>
                                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>{sb.estimatedMin.toFixed(0)} min{sb.hrAvg ? ` · FC ~${sb.hrAvg}` : ''}</div>
                                </div>
                                <LocalInput
                                  value={sb.watts}
                                  min={50} max={600}
                                  onCommit={newW => {
                                    setSpecificBlocks(prev => prev.map(x => x.id === sb.id ? { ...x, watts: newW } : x))
                                  }}
                                  style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: `1px solid ${zc}50`, background: 'var(--bg-card2)', color: zc, fontSize: 12, fontWeight: 800, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                                />
                                <span style={{ fontSize: 9, color: 'var(--text-dim)', flexShrink: 0 }}>W</span>
                              </div>
                            )
                          })}

                          {/* EF */}
                          {remainingS > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                              <div style={{ width: 3, height: 32, borderRadius: 2, background: '#22c55e', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>Plats & descentes</div>
                                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>{Math.round(remainingS / 60)} min · Z2</div>
                              </div>
                              <LocalInput
                                value={efWatts}
                                min={50} max={600}
                                onCommit={setEfWatts}
                                style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.4)', background: 'var(--bg-card2)', color: '#22c55e', fontSize: 12, fontWeight: 800, fontFamily: 'DM Mono, monospace', textAlign: 'right' as const, outline: 'none' }}
                              />
                              <span style={{ fontSize: 9, color: 'var(--text-dim)', flexShrink: 0 }}>W</span>
                            </div>
                          )}

                          {/* KPIs */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                            {[
                              { lbl: 'Moy', val: `${avgW}W` },
                              { lbl: 'TSS', val: tssResult ? String(tssResult.tss) : '—' },
                              { lbl: 'Kcal', val: kcal > 0 ? String(kcal) : '—' },
                              { lbl: '↑ Total', val: `${Math.round(totalClimbS / 60)}min` },
                            ].map(({ lbl, val }) => (
                              <div key={lbl} style={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '8px 6px', textAlign: 'center' as const }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: accent, fontFamily: 'DM Mono, monospace' }}>{val}</div>
                                <div style={{ fontSize: 8, color: 'var(--text-dim)', marginTop: 2, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{lbl}</div>
                              </div>
                            ))}
                          </div>
                          {tssResult && (
                            <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', textAlign: 'center' as const }}>
                              NP {tssResult.np}W · IF {tssResult.ifVal.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )
              }

              // ── STEP FREE TEXT (inchangé) ─────────────────────
              return (
                <div style={{ borderRadius: 12, border: `1px solid ${accent}15`, padding: mobile ? '14px' : '18px', background: `${accent}05` }}>
                  {hasClimbs && (
                    <button onClick={() => setAiFlowStep('ask')} style={{
                      marginBottom: 10, padding: '4px 10px', borderRadius: 7,
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-dim)', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    }}>← Retour au flow parcours</button>
                  )}
                  <div style={{ position: 'relative' as const }}>
                    <textarea value={aiPrompt}
                      onChange={e => {
                        const val = e.target.value
                        setAiPrompt(val)
                        if (aiError) setAiError(null)
                        const lastLine = val.split('\n').pop() ?? ''
                        const m = lastLine.match(/\/([\w]*)$/)
                        if (m) { setShowSlashMenu(true); setSlashFilter(m[1].toLowerCase()) }
                        else { setShowSlashMenu(false) }
                      }}
                      onKeyDown={e => { if (e.key === 'Escape') setShowSlashMenu(false) }}
                      rows={6}
                      placeholder={isStrength
                        ? 'Tape / pour les types de circuits\n\nEx :\n/lap\nSquat @100kg\nBench @80kg\nx4\n\n/superset\nCurl @14kg + Triceps @20kg\nx3'
                        : 'Ex : 10×400m @3:30/km avec 1min récup, échauffement 15min...'}
                      style={{
                        width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border)',
                        borderRadius: 9, color: 'var(--text)', padding: 12, fontSize: 13, outline: 'none',
                        resize: 'vertical' as const, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.6,
                        boxSizing: 'border-box' as const, minHeight: 140,
                      }} />
                    {showSlashMenu && isStrength && (() => {
                      const filtered = CIRCUIT_TYPES.filter(ct =>
                        !slashFilter || ct.slash.startsWith(slashFilter) || ct.label.toLowerCase().startsWith(slashFilter)
                      )
                      if (filtered.length === 0) return null
                      return (
                        <div style={{ position: 'absolute' as const, bottom: '100%', left: 0, right: 0, marginBottom: 4, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 -6px 24px rgba(0,0,0,0.18)', zIndex: 20 }}>
                          {filtered.map((ct, idx) => (
                            <button key={ct.id} onClick={() => {
                              const lines = aiPrompt.split('\n')
                              lines[lines.length - 1] = (lines[lines.length - 1] ?? '').replace(/\/[\w]*$/, `/${ct.slash}`)
                              setAiPrompt(lines.join('\n') + '\n')
                              setShowSlashMenu(false)
                            }} style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 14, width: 22, textAlign: 'center' as const, flexShrink: 0 }}>{ct.icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>/{ct.slash}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8 }}>{ct.desc}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  <button onClick={() => handleAIGenerate()} disabled={aiLoading || !aiPrompt.trim()} style={{
                    marginTop: 8, width: '100%', padding: 11, borderRadius: 9, border: 'none',
                    background: aiLoading ? 'var(--border)' : `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer',
                    fontFamily: 'Syne, sans-serif',
                  }}>{aiLoading ? 'Génération...' : 'Générer les blocs'}</button>
                  {aiError && (
                    <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#ef4444', fontSize: 11, lineHeight: 1.5, wordBreak: 'break-all' as const }}>
                      {aiError}
                    </div>
                  )}
                </div>
              )
            })()
          )}
        </div>

        {/* SÉPARATEUR 3 — entre Construction et Nutrition */}
        <div style={{ height: 1, background: 'var(--border)', margin: mobile ? '12px 16px' : '16px 24px', opacity: 0.5 }} />

        {/* STRATÉGIE NUTRITIONNELLE */}
        <div style={{ padding: mobile ? '20px 16px 14px' : '20px 24px 18px' }}>
          <button onClick={() => setNutritionOpen(!nutritionOpen)} style={{
            width: '100%', padding: mobile ? '12px' : '13px', borderRadius: 10,
            border: '1px solid var(--border)', background: nutritionItems.length > 0 ? `${accent}08` : 'var(--bg-card)',
            color: nutritionItems.length > 0 ? accent : 'var(--text-dim)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: accent }}>★</span>
            Stratégie nutritionnelle
            {nutritionItems.length > 0 && (
              <span style={{ fontSize: 10, color: accent, fontFamily: 'DM Mono, monospace' }}>
                · {nutritionItems.length} ravitaillement{nutritionItems.length > 1 ? 's' : ''}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)', transform: nutritionOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▾</span>
          </button>

          {nutritionOpen && (
            <div style={{
              marginTop: 10, padding: '16px', borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--bg-card2)',
            }}>
              {/* Toggle Manuel / IA */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 0, background: 'var(--bg-card)', borderRadius: 7, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <button onClick={() => setNutritionTab('manual')} style={{
                    padding: '5px 12px', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: nutritionTab === 'manual' ? `${accent}18` : 'transparent',
                    color: nutritionTab === 'manual' ? accent : 'var(--text-dim)',
                  }}>Manuel</button>
                  <button onClick={() => setNutritionTab('ai')} style={{
                    padding: '5px 12px', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: nutritionTab === 'ai' ? `${accent}18` : 'transparent',
                    color: nutritionTab === 'ai' ? accent : 'var(--text-dim)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}><span style={{ fontSize: 11 }}>✦</span> IA</button>
                </div>
              </div>

              {nutritionTab === 'manual' ? (
                <>
                  {/* Liste des ravitaillements — groupés par timeMin */}
                  {nutritionItems.length > 0 && (() => {
                    const grouped: Record<number, NutritionItem[]> = {}
                    for (const item of nutritionItems) {
                      if (!grouped[item.timeMin]) grouped[item.timeMin] = []
                      grouped[item.timeMin].push(item)
                    }
                    const sortedTimes = Object.keys(grouped).map(Number).sort((a, b) => a - b)
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 14 }}>
                        {sortedTimes.map(timeMin => {
                          const items = grouped[timeMin]
                          return (
                            <div key={timeMin} style={{
                              padding: '10px 14px', borderRadius: 10,
                              border: '1px solid var(--border)', background: 'var(--bg-card)',
                            }}>
                              {/* En-tête du moment */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: items.length > 0 ? 8 : 0 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: accent, fontFamily: '"DM Mono", monospace', minWidth: 44 }}>
                                  {timeMin === 0 ? 'Départ' : `${timeMin}'`}
                                </span>
                                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>
                                  {items.reduce((s, x) => s + x.glucidesG, 0)}g glu
                                </span>
                              </div>
                              {/* Aliments */}
                              {items.map((item, ii) => (
                                <div key={item.id} style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'auto 1fr auto auto auto',
                                  gap: 8, alignItems: 'center',
                                  paddingBottom: ii < items.length - 1 ? 6 : 0,
                                  marginBottom: ii < items.length - 1 ? 6 : 0,
                                  borderBottom: ii < items.length - 1 ? '1px solid var(--border)' : 'none',
                                }}>
                                  {/* Type */}
                                  <select value={item.type}
                                    onChange={e => setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, type: e.target.value as NutritionItem['type'] } : x))}
                                    style={{ fontSize: 9, padding: '3px 6px', borderRadius: 5, border: `1px solid ${accent}44`, background: `${accent}0a`, color: accent, outline: 'none', cursor: 'pointer' }}>
                                    {NUTRITION_TYPES.map(nt => <option key={nt.id} value={nt.id}>{nt.label}</option>)}
                                  </select>
                                  {/* Nom + sélecteur produits athlète */}
                                  <div style={{ display: 'flex', flexDirection: 'column' as const, minWidth: 0, gap: 2 }}>
                                    <input value={item.name} placeholder="Aliment..."
                                      onChange={e => setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, name: e.target.value } : x))}
                                      style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 12, outline: 'none', minWidth: 0 }} />
                                    {athleteProducts.filter(p => p.type === item.type).length > 0 && (
                                      <select
                                        value=""
                                        onChange={e => {
                                          const prod = athleteProducts.find(p => p.name === e.target.value)
                                          if (prod) setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, name: prod.name, glucidesG: prod.glucidesG, proteinesG: prod.proteinesG, quantity: prod.quantity } : x))
                                        }}
                                        style={{ appearance: 'none' as const, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', fontSize: 9, cursor: 'pointer', outline: 'none' }}>
                                        <option value="">Mes produits ▾</option>
                                        {athleteProducts.filter(p => p.type === item.type).map(p => (
                                          <option key={p.name} value={p.name}>{p.name} ({p.glucidesG}g glu)</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                  {/* Glucides */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <input type="number" min={0} value={item.glucidesG}
                                      onChange={e => setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, glucidesG: parseInt(e.target.value) || 0 } : x))}
                                      style={{ width: 38, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card)', color: accent, fontSize: 11, fontFamily: '"DM Mono",monospace', fontWeight: 700, textAlign: 'center' as const, outline: 'none' }} />
                                    <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>g</span>
                                  </div>
                                  {/* Quantité */}
                                  <input value={item.quantity} placeholder="Qté"
                                    onChange={e => setNutritionItems(prev => prev.map(x => x.id === item.id ? { ...x, quantity: e.target.value } : x))}
                                    style={{ width: 56, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 11, fontFamily: '"DM Mono",monospace', outline: 'none' }} />
                                  {/* Supprimer */}
                                  <button onClick={() => setNutritionItems(prev => prev.filter(x => x.id !== item.id))} style={{
                                    background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1,
                                  }}>×</button>
                                </div>
                              ))}
                              {/* Ajouter au même moment */}
                              <button onClick={() => {
                                setNutritionItems(prev => [...prev, {
                                  id: `nut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                  timeMin, type: 'gel' as const, name: '', quantity: '1 gel',
                                  glucidesG: 25, proteinesG: 0, notes: '',
                                }])
                              }} style={{
                                marginTop: 6, background: 'none', border: 'none',
                                color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', opacity: 0.65,
                                padding: 0,
                              }}>+ ajouter à ce moment</button>
                            </div>
                          )
                        })}
                        {/* Summary */}
                        <div style={{ display: 'flex', gap: 16, padding: '4px 0', fontSize: 11, color: 'var(--text-dim)', flexWrap: 'wrap' as const }}>
                          <span>Total : <strong style={{ color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{nutritionItems.reduce((s, x) => s + x.glucidesG, 0)}g</strong> glucides</span>
                          <span><strong style={{ color: accent, fontFamily: 'DM Mono, monospace' }}>
                            {dur > 0 ? Math.round(nutritionItems.reduce((s, x) => s + x.glucidesG, 0) / (dur / 60)) : 0}g/h
                          </strong></span>
                        </div>
                      </div>
                    )
                  })()}

                  <button onClick={() => {
                    const lastTime = nutritionItems.length > 0 ? Math.max(...nutritionItems.map(x => x.timeMin)) : 0
                    setNutritionItems(prev => [...prev, {
                      id: `nut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      timeMin: nutritionItems.length === 0 ? 0 : lastTime + 30,
                      type: 'gel' as const,
                      name: '', quantity: '1 gel', glucidesG: 25, proteinesG: 0, notes: '',
                    }])
                  }} style={{
                    width: '100%', padding: '9px', borderRadius: 8,
                    border: '1px dashed var(--border)', background: 'transparent',
                    color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
                  }}>+ Ajouter un ravitaillement</button>
                </>
              ) : (
                <>
                  {/* MODE IA */}
                  <textarea value={nutritionAiPrompt} onChange={e => setNutritionAiPrompt(e.target.value)} rows={3}
                    placeholder={'Ex :\n- 1 gel toutes les 30min\n- 1 barre à mi-parcours\n- Boisson isotonique toutes les 20min\n\nOu simplement : "Sortie vélo 3h, 250w moy, chaleur"'}
                    style={{
                      width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 9, color: 'var(--text)', padding: 12, fontSize: 12, outline: 'none',
                      resize: 'vertical' as const, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5,
                      boxSizing: 'border-box' as const,
                    }} />
                  <button onClick={async () => {
                    if (!nutritionAiPrompt.trim() || nutritionAiLoading) return
                    setNutritionAiLoading(true)
                    try {
                      const blocksDesc = blocks.length > 0
                        ? blocks.filter(b => b.type !== 'circuit_header').map(b => `${b.label}: ${b.durationMin}min Z${b.zone} ${b.value || ''}`).join(', ')
                        : `${SPORT_LABEL[sport]} ${formatHM(dur)}`

                      // Produits de l'athlète inclus dans le message utilisateur
                      const productCtx = athleteProducts.length > 0
                        ? `\nPRODUITS DISPONIBLES (utilise ces noms et valeurs EXACTES) :\n${athleteProducts.map(p => `- ${p.name} (${p.type}) : ${p.glucidesG}g glucides, ${p.proteinesG}g protéines, quantité : ${p.quantity}`).join('\n')}`
                        : ''
                      const fullNutritionMsg = `${nutritionAiPrompt}${productCtx}`

                      const res = await fetch('/api/coach-stream', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          messages: [{ role: 'user', content: fullNutritionMsg }],
                          sport,
                          mode: 'nutrition',
                          context: { duration: dur, blocks: blocksDesc },
                        }),
                      })
                      if (!res.ok) throw new Error(`Erreur ${res.status}`)
                      const reader = res.body?.getReader()
                      const decoder = new TextDecoder()
                      let raw = ''
                      if (reader) {
                        while (true) {
                          const { done, value } = await reader.read()
                          if (done) break
                          const chunk = decoder.decode(value, { stream: true })
                          for (const line of chunk.split('\n')) {
                            if (!line.startsWith('data: ')) continue
                            const p = line.slice(6).trim()
                            if (p === '[DONE]') continue
                            try {
                              const d = JSON.parse(p) as Record<string, unknown>
                              if (typeof d.text === 'string') raw += d.text
                            } catch { if (p !== '[DONE]') raw += p }
                          }
                        }
                      }
                      const match = raw.match(/\[[\s\S]*\]/)
                      if (match) {
                        const parsed = JSON.parse(match[0]) as Record<string, unknown>[]
                        const items: NutritionItem[] = parsed.map((p, i) => ({
                          id: `ai_nut_${Date.now()}_${i}`,
                          timeMin: typeof p.timeMin === 'number' ? p.timeMin : 0,
                          type: (['gel','barre','boisson','solide','autre'].includes(p.type as string) ? p.type : 'gel') as NutritionItem['type'],
                          name: typeof p.name === 'string' ? p.name : '',
                          quantity: typeof p.quantity === 'string' ? p.quantity : '',
                          glucidesG: typeof p.glucidesG === 'number' ? p.glucidesG : 0,
                          proteinesG: typeof p.proteinesG === 'number' ? p.proteinesG : 0,
                          notes: '',
                        }))
                        setNutritionItems(items)
                        setNutritionTab('manual')
                        setNutritionAiPrompt('')
                      } else {
                        console.error('[Nutrition IA] No JSON in response:', raw.slice(0, 300))
                      }
                    } catch (e) { console.error('[Nutrition IA]', e) }
                    finally { setNutritionAiLoading(false) }
                  }} disabled={nutritionAiLoading || !nutritionAiPrompt.trim()} style={{
                    marginTop: 8, width: '100%', padding: 11, borderRadius: 9, border: 'none',
                    background: nutritionAiLoading ? 'var(--border)' : `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    cursor: nutritionAiLoading ? 'wait' : 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    opacity: !nutritionAiPrompt.trim() ? 0.5 : 1,
                  }}>
                    {nutritionAiLoading ? 'Génération...' : 'Générer la stratégie'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── BOUTON EXÉCUTION (muscu uniquement) ── */}
        {isEdit && isStrength && blocks.filter(b => b.type !== 'circuit_header').length > 0 && (
          <div style={{ padding: mobile ? '4px 16px 20px' : '4px 24px 24px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={e => { e.stopPropagation(); setExecuteMode(true) }}
              style={{
                width: 72, height: 72, borderRadius: '50%', border: 'none',
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                boxShadow: `0 4px 20px ${accent}44`,
                color: '#fff', cursor: 'pointer',
                display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                gap: 2, transition: 'transform 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <path d="M8 5v14l11-7z" fill="#fff" />
              </svg>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Lancer</span>
            </button>
          </div>
        )}

        </div>{/* fin BODY scrollable */}

        {/* FOOTER */}
        <div style={{
          padding: mobile ? '12px 16px' : '13px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
          flexWrap: 'wrap' as const,
        }}>
          {isEdit ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' as const, width: '100%' }}>
              {/* ── Tout à gauche : Fermer ── */}
              <button
                onClick={() => { if (isDirty) { setShowCloseModal(true) } else { onClose() } }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#111827' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
                style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: '#6B7280', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Fermer
              </button>
              {/* ── Gauche : actions secondaires (text-only, no bg) ── */}
              <button onClick={handleExportPDF} title="Exporter en PDF" style={{
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 8.5L2 4.5h2.5V1h3v3.5H10L6 8.5Z" fill="currentColor"/><rect x="1" y="10" width="10" height="1.2" rx="0.6" fill="currentColor"/></svg>
                PDF
              </button>
              <button onClick={() => parcoursInputRef.current?.click()} title="Importer un parcours GPX/TCX/KML" style={{
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1.5C4.07 1.5 2.5 3.07 2.5 5c0 2.5 3.5 5.5 3.5 5.5s3.5-3 3.5-5.5C9.5 3.07 7.93 1.5 6 1.5Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" fill="currentColor"/></svg>
                {parcoursLoading ? '…' : parcoursData ? (parcoursData.distance != null ? `${parcoursData.distance} km` : '✓') : 'Parcours'}
              </button>
              <button onClick={async () => {
                const name = prompt('Nom du favori :', title || `${SPORT_LABEL[sport]}`)
                if (!name) return
                try {
                  const { createClient } = await import('@/lib/supabase/client')
                  const sb = createClient()
                  const { data: { user } } = await sb.auth.getUser()
                  if (!user) return
                  await sb.from('session_favorites').insert({
                    user_id: user.id, name, sport,
                    training_type: trainingTypes.join('+') || null, blocks_data: blocks,
                    nutrition_data: nutritionItems, duration_min: dur, rpe, notes: desc,
                  })
                  alert('✓ Favori sauvegardé')
                } catch (e) { console.error('[Fav]', e) }
              }} style={{
                padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>★ Favori</button>
              {onDuplicate && session && (
                <button onClick={() => setShowDuplicateMenu(true)} style={{
                  padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>Dupliquer</button>
              )}

              <div style={{ flex: 1 }} />

              {/* ── Centre : Plan A/B tabs ── */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {(['A', 'B'] as PlanVariant[]).map(p => (
                  <button key={p} onClick={() => setSelPlan(p)} style={{
                    padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: selPlan === p ? (p === 'A' ? 'rgba(6,182,212,0.10)' : 'rgba(167,139,250,0.10)') : 'transparent',
                    border: selPlan === p ? `1px solid ${p === 'A' ? '#06B6D4' : '#a78bfa'}` : '1px solid var(--border)',
                    color: selPlan === p ? (p === 'A' ? '#06B6D4' : '#a78bfa') : 'var(--text-dim)',
                  }}>Plan {p}</button>
                ))}
              </div>

              <div style={{ flex: 1 }} />

              {/* ── Droite : actions principales ── */}
              {onDelete && session && (
                <button onClick={() => { if (confirm('Supprimer cette séance ?')) { onDelete(session.id); onClose() } }} style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'transparent', border: 'none',
                  color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>Supprimer</button>
              )}
              {session?.originalContent && (
                <button onClick={() => {
                  const o = session.originalContent as Record<string, unknown>
                  if (typeof o.titre === 'string') setTitle(o.titre)
                  if (typeof o.duration_min === 'number') setDur(o.duration_min)
                  if (typeof o.notes === 'string') setDesc(o.notes)
                  if (typeof o.rpe === 'number') setRpe(o.rpe)
                }} style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'transparent', border: 'none',
                  color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontWeight: 600,
                }}>Réinitialiser IA</button>
              )}
              {session?.status !== 'done' && onValidate && session && (
                <button onClick={() => onValidate({ ...session, sport, title, time, durationMin: dur, rpe, blocks, notes: desc })} style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: 'transparent', border: '1px solid rgba(34,197,94,0.5)',
                  color: '#22c55e', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>Valider</button>
              )}
              <button onClick={async () => {
                if (!session?.id || saving) return
                setSaving(true)
                try {
                  const { createClient: cc } = await import('@/lib/supabase/client')
                  const sb = cc()
                  const _parcoursMin = parseDurationToMin(totalDuration)
                  const _saveDur = aiFlowStep === 'parcours' && _parcoursMin > 0 ? _parcoursMin : dur
                  const _pTss = computeParcoursFlowTSS()
                  const _saveTss = (aiFlowStep === 'parcours' && _pTss ? _pTss.tss : sessionStats.tssHigh) || session.tss || null
                  const _savedBlocks = isStrength && exercises.length > 0 && gymCircuitsRef.current.length > 0
                    ? exercisesToBlocks(exercises, gymCircuitsRef.current, gymCircuitMapRef.current)
                    : aiFlowStep === 'parcours' && parcoursData
                      ? buildParcoursBlocks()
                      : blocks ?? []
                  const _savedParcours = parcoursDataWithConfig()
                  await sb.from('planned_sessions').update({
                    sport, title, time,
                    duration_min: _saveDur,
                    rpe: rpe ?? null,
                    notes: desc ?? null,
                    blocks: _savedBlocks,
                    tss: _saveTss,
                    parcours_data: _savedParcours ?? null,
                    nutrition_data: nutritionItems.length > 0 ? nutritionItems : null,
                    updated_at: new Date().toISOString(),
                  }).eq('id', session.id)
                  onAutoSave?.({
                    ...session,
                    sport, title, time,
                    durationMin: _saveDur,
                    tss: _saveTss ?? undefined,
                    notes: desc || undefined,
                    rpe,
                    blocks: _savedBlocks,
                    parcoursData: _savedParcours ?? undefined,
                    nutritionItems: nutritionItems.length > 0 ? nutritionItems : undefined,
                  })
                  setSaved(true)
                  setIsDirty(false)
                  initialSnapshotRef.current = JSON.stringify({ sport, title, desc, dur, rpe, blocks, nutritionItems })
                  setTimeout(() => setSaved(false), 2000)
                } catch (e) { console.error('[Save]', e) }
                finally { setSaving(false) }
              }} style={{
                padding: '10px 22px', borderRadius: 9,
                border: 'none',
                background: saved ? '#22c55e' : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                boxShadow: saved ? 'none' : `0 4px 14px ${accent}40`,
                transition: 'background 0.3s, box-shadow 0.2s',
                fontFamily: 'Syne, sans-serif', letterSpacing: '0.01em',
              }}>{saving ? '…' : saved ? '✓ Enregistré' : 'Enregistrer →'}</button>
            </div>
          ) : (
            /* Mode create */
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={onClose} style={{
                padding: '10px 20px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
              }}>Annuler</button>
              <button onClick={async () => {
                const name = prompt('Nom du favori :', title || `${SPORT_LABEL[sport]}`)
                if (!name) return
                try {
                  const { createClient } = await import('@/lib/supabase/client')
                  const sb = createClient()
                  const { data: { user } } = await sb.auth.getUser()
                  if (!user) return
                  await sb.from('session_favorites').insert({
                    user_id: user.id, name, sport,
                    training_type: trainingTypes.join('+') || null, blocks_data: blocks,
                    nutrition_data: nutritionItems, duration_min: dur, rpe, notes: desc,
                  })
                  alert('✓ Favori sauvegardé')
                } catch (e) { console.error('[Fav]', e) }
              }} style={{
                padding: '10px 20px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
              }}>★ Favori</button>
              <div style={{ flex: 1 }} />
              <button onClick={handleSubmit} style={{
                padding: '10px 28px', borderRadius: 8, border: 'none',
                background: accent, color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Syne, sans-serif',
              }}>Ajouter la séance</button>
            </div>
          )}
        </div>

        {/* Duplicate day menu */}
        {/* ── Modal : modifications non enregistrées ── */}
        {showCloseModal && (
          <div style={{
            position: 'fixed' as const, inset: 0, zIndex: 1200,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }} onClick={() => setShowCloseModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--bg-card)', borderRadius: 16, padding: 32,
              maxWidth: 400, width: '100%', border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column' as const, gap: 0,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12, lineHeight: 1 }}>⚠</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', fontFamily: 'Syne, sans-serif', marginBottom: 8 }}>
                Modifications non enregistrées
              </div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.5 }}>
                Vous avez des modifications non enregistrées sur cette séance. Voulez-vous les enregistrer avant de quitter ?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {/* Enregistrer et quitter */}
                <button onClick={async () => {
                  if (!session?.id || saving) return
                  setSaving(true)
                  try {
                    const { createClient: cc } = await import('@/lib/supabase/client')
                    const sb = cc()
                    const _parcoursMin = parseDurationToMin(totalDuration)
                    const _saveDur = aiFlowStep === 'parcours' && _parcoursMin > 0 ? _parcoursMin : dur
                    const _pTss = computeParcoursFlowTSS()
                    const _saveTss = (aiFlowStep === 'parcours' && _pTss ? _pTss.tss : sessionStats.tssHigh) || session.tss || null
                    const _savedBlocks = isStrength && exercises.length > 0 && gymCircuitsRef.current.length > 0
                      ? exercisesToBlocks(exercises, gymCircuitsRef.current, gymCircuitMapRef.current)
                      : aiFlowStep === 'parcours' && parcoursData
                        ? buildParcoursBlocks()
                        : blocks ?? []
                    const _savedParcours = parcoursDataWithConfig()
                    await sb.from('planned_sessions').update({
                      sport, title, time,
                      duration_min: _saveDur,
                      rpe: rpe ?? null,
                      notes: desc ?? null,
                      blocks: _savedBlocks,
                      tss: _saveTss,
                      parcours_data: _savedParcours ?? null,
                      nutrition_data: nutritionItems.length > 0 ? nutritionItems : null,
                      updated_at: new Date().toISOString(),
                    }).eq('id', session.id)
                    onAutoSave?.({
                      ...session,
                      sport, title, time,
                      durationMin: _saveDur,
                      tss: _saveTss ?? undefined,
                      notes: desc || undefined,
                      rpe,
                      blocks: _savedBlocks,
                      parcoursData: _savedParcours ?? undefined,
                      nutritionItems: nutritionItems.length > 0 ? nutritionItems : undefined,
                    })
                    setIsDirty(false)
                    setShowCloseModal(false)
                    onClose()
                  } catch (e) { console.error('[Save+Close]', e) }
                  finally { setSaving(false) }
                }} style={{
                  width: '100%', padding: '12px 16px', borderRadius: 8,
                  background: '#111827', border: 'none',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  {saving ? '…' : 'Enregistrer et quitter'}
                </button>
                {/* Quitter sans enregistrer */}
                <button onClick={() => { setShowCloseModal(false); onClose() }} style={{
                  width: '100%', padding: '12px 16px', borderRadius: 8,
                  background: 'transparent', border: '1px solid #EF4444',
                  color: '#EF4444', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  Quitter sans enregistrer
                </button>
                {/* Annuler */}
                <button onClick={() => setShowCloseModal(false)} style={{
                  width: '100%', padding: '12px 16px', borderRadius: 8,
                  background: 'transparent', border: 'none',
                  color: '#6B7280', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {showDuplicateMenu && onDuplicate && session && (
          <div style={{
            position: 'fixed' as const, inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }} onClick={() => setShowDuplicateMenu(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--bg-card)', borderRadius: 14, padding: 20,
              maxWidth: 320, width: '100%', border: '1px solid var(--border)',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Dupliquer sur quel jour ?</h3>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, i) => (
                  <button key={i} onClick={() => {
                    onDuplicate(i, { ...session, id: '', title: session.title + ' (copie)', dayIndex: i })
                    setShowDuplicateMenu(false)
                    onClose()
                  }} style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8, textAlign: 'left' as const,
                    border: '1px solid var(--border)', background: 'var(--bg-card2)',
                    color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontWeight: 500,
                  }}>{day}</button>
                ))}
              </div>
              <button onClick={() => setShowDuplicateMenu(false)} style={{
                marginTop: 10, width: '100%', padding: 8, borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer',
              }}>Annuler</button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
