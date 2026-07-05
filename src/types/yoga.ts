export type YogaCategory = 'flexibility' | 'mobility' | 'strength' | 'breathing' | 'balance'

export interface YogaExercise {
  id: string
  name: string
  category: YogaCategory
  default_duration_seconds: number
  description?: string | null
  is_custom: boolean
  user_id?: string | null
}

export interface YogaSessionExercise {
  exerciseId: string
  name: string
  category: YogaCategory
  duration_seconds: number
}

export interface YogaPlannedSession {
  id: string
  title: string
  target_duration_min: number
  exercises: YogaSessionExercise[]
}

export const YOGA_CATEGORIES: { id: YogaCategory; label: string; labelKey: string }[] = [
  { id: 'flexibility', label: 'Flexibilité', labelKey: 'rectypes.yogaCatFlexibility' },
  { id: 'mobility',    label: 'Mobilité',    labelKey: 'rectypes.yogaCatMobility' },
  { id: 'strength',    label: 'Force',       labelKey: 'rectypes.yogaCatStrength' },
  { id: 'breathing',   label: 'Respiration', labelKey: 'rectypes.yogaCatBreathing' },
  { id: 'balance',     label: 'Équilibre',   labelKey: 'rectypes.yogaCatBalance' },
]

export const YOGA_TYPES = [
  { id: 'yoga',       label: 'Yoga',        labelKey: 'rectypes.typeYogaLabel',       desc: 'Postures et flux',      descKey: 'rectypes.typePosturesFluxDesc' },
  { id: 'mobility',   label: 'Mobilité',    labelKey: 'rectypes.yogaCatMobility',     desc: 'Mobilité articulaire',  descKey: 'rectypes.typeMobiliteArticulaireDesc' },
  { id: 'stretch',    label: 'Étirements',  labelKey: 'rectypes.typeEtirementsLabel', desc: 'Récupération musculaire', descKey: 'rectypes.typeRecupMusculaireDesc' },
  { id: 'breathing',  label: 'Respiration', labelKey: 'rectypes.yogaCatBreathing',    desc: 'Exercices respiratoires', descKey: 'rectypes.typeExercicesRespiDesc' },
  { id: 'balance',    label: 'Équilibre',   labelKey: 'rectypes.yogaCatBalance',      desc: 'Proprioception',        descKey: 'rectypes.typeProprioceptionDesc' },
  { id: 'meditation', label: 'Méditation',  labelKey: 'rectypes.typeMeditationLabel', desc: 'Pleine conscience',     descKey: 'rectypes.typePleineConscienceDesc' },
]

export const DEFAULT_YOGA_EXERCISES: Omit<YogaExercise, 'id' | 'user_id'>[] = [
  { name: 'Chien tête en bas',      category: 'flexibility', default_duration_seconds: 45,  is_custom: false },
  { name: 'Pigeon',                  category: 'flexibility', default_duration_seconds: 60,  is_custom: false },
  { name: 'Fente basse',             category: 'flexibility', default_duration_seconds: 45,  is_custom: false },
  { name: 'Papillon',                category: 'flexibility', default_duration_seconds: 60,  is_custom: false },
  { name: 'Torsion assise',          category: 'flexibility', default_duration_seconds: 30,  is_custom: false },
  { name: "Position de l'enfant",    category: 'flexibility', default_duration_seconds: 60,  is_custom: false },
  { name: 'Chat-Vache',              category: 'mobility',    default_duration_seconds: 30,  is_custom: false },
  { name: "Cercles d'épaules",       category: 'mobility',    default_duration_seconds: 30,  is_custom: false },
  { name: 'Mobilisation hanches',    category: 'mobility',    default_duration_seconds: 45,  is_custom: false },
  { name: 'Ouverture thoracique',    category: 'mobility',    default_duration_seconds: 45,  is_custom: false },
  { name: 'Rotations cervicales',    category: 'mobility',    default_duration_seconds: 20,  is_custom: false },
  { name: 'Planche',                 category: 'strength',    default_duration_seconds: 30,  is_custom: false },
  { name: 'Planche latérale',        category: 'strength',    default_duration_seconds: 30,  is_custom: false },
  { name: 'Pont fessier',            category: 'strength',    default_duration_seconds: 45,  is_custom: false },
  { name: 'Guerrier I',              category: 'strength',    default_duration_seconds: 30,  is_custom: false },
  { name: 'Guerrier II',             category: 'strength',    default_duration_seconds: 30,  is_custom: false },
  { name: 'Respiration 4-7-8',       category: 'breathing',   default_duration_seconds: 120, is_custom: false },
  { name: 'Cohérence cardiaque',     category: 'breathing',   default_duration_seconds: 300, is_custom: false },
  { name: 'Respiration abdominale',  category: 'breathing',   default_duration_seconds: 60,  is_custom: false },
  { name: 'Arbre',                   category: 'balance',     default_duration_seconds: 30,  is_custom: false },
  { name: 'Guerrier III',            category: 'balance',     default_duration_seconds: 30,  is_custom: false },
  { name: 'Demi-lune',               category: 'balance',     default_duration_seconds: 30,  is_custom: false },
]
