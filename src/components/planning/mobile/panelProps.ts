// Props partagées par les coquilles SessionEditor mobile & desktop (même
// contenu éditorial, seule la mise en page diffère). Défini à part pour
// éviter toute dépendance circulaire entre les deux coquilles.
import type { SportType, CyclingSub, PlanVariant, Block } from '@/app/planning/page'
import type { AthleteRefs } from './editorial'
import type { ExerciseItem, ExoCircuit } from './strength'

// Parcours déjà parsé (parcours_data d'une séance, ex. liée à un stage).
export interface PanelParcours {
  gpsTrace?: { lat: number; lon: number }[]
  elevationProfile?: { distKm: number; ele: number }[]
  distance?: number | null
  elevation?: number | null
  name?: string
}

export interface SessionEditorPanelProps {
  mode: 'create' | 'edit'
  reserveMode?: boolean   // réserve Builder : masque Sport / Date / Heure
  sport: SportType; accent: string; onSportChange: (s: SportType) => void
  cyclingSub: CyclingSub; setCyclingSub: (s: CyclingSub) => void
  brickRun: boolean; setBrickRun: (b: boolean) => void
  trainingTypes: string[]; setTrainingTypes: (t: string[]) => void
  title: string; setTitle: (v: string) => void
  date: string; setDate: (v: string) => void; time: string; setTime: (v: string) => void
  dur: number; setDur: (n: number) => void
  rpe: number; setRpe: (n: number) => void
  desc: string; setDesc: (v: string) => void
  selPlan: PlanVariant
  blocks: Block[]; setBlocks: (b: Block[]) => void
  parcoursData?: PanelParcours
  sm: number; sn: number
  athlete: { ftp: number | null; lthrBike: number | null; lthrRun: number | null; runThresholdPaceStr: string | null; swimCSSStr: string | null; hrMax: number | null } | null
  refs: AthleteRefs
  builderTab: 'manual' | 'ai'; setBuilderTab: (t: 'manual' | 'ai') => void
  saving: boolean; saved: boolean
  onClose: () => void; onSave: () => void; onExportPDF: () => void; onFavorite: () => void
  onDelete?: () => void
  // Muscu / Hyrox (builder par exercices) — sync vers les refs côté parent
  exercises: ExerciseItem[]; setExercises: (e: ExerciseItem[]) => void
  circuits: ExoCircuit[]; setCircuits: (c: ExoCircuit[]) => void
  exoMap: Record<string, string>; setExoMap: (m: Record<string, string>) => void
}
