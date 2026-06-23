// ══════════════════════════════════════════════════════════════════
// Bibliothèque — Séances Running. Modèle blocs → profil d'intensité.
// Voir PROMPT_BIBLIO_RUNNING.md §2/§3.
// ══════════════════════════════════════════════════════════════════

export type RunBucket = '5k' | '10k' | 'semi' | 'marathon' | 'neuro'
export type Filiere =
  | 'aerobie' | 'seuil' | 'vma' | 'specifique' | 'neuromusculaire' | 'mixte' | 'test'
export type Zone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6' | 'Z7'
export type PhaseBloc = 'echauffement' | 'corps' | 'recup' | 'retour-calme'
export type Intensite = 'faible' | 'modere' | 'eleve' | 'maximum'

export interface BlocRecup {
  zone: Zone
  dureeSec?: number
  distanceM?: number
  actif: boolean
  label?: string
}

export interface Bloc {
  phase: PhaseBloc
  zone: Zone                    // pilote couleur + hauteur de barre
  label: string
  allure?: string               // "@5k", "@seuil", "EF"…
  distanceM?: number            // soit distance…
  dureeSec?: number             // …soit durée
  reps?: number                 // défaut 1
  recup?: BlocRecup
}

export interface Seance {
  id: string
  nom: string
  sport: 'running'
  bucket: RunBucket
  filiere: Filiere              // tag primaire de tri dans la bulle
  distanceCible?: RunBucket[]   // distances servies (neuro surtout)
  objectif: string
  dureeEstimeeMin: number
  intensite: Intensite
  rpe: number                   // 1..10
  pourQui: string
  phase: string                 // Base | Général | Spé | Affûtage
  tags: string[]
  blocs: Bloc[]
  conseil?: string
}
