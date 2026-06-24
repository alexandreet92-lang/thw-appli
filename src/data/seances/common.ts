// ══════════════════════════════════════════════════════════════════
// Bibliothèque — modèle de séance partagé (Aviron · Natation · Trail).
// Voir PROMPT_BIBLIO_ENDURANCE.md §1.
// ══════════════════════════════════════════════════════════════════

export type Zone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6' | 'Z7'
export type PhaseBloc = 'echauffement' | 'corps' | 'recup' | 'retour-calme'
export type Intensite = 'faible' | 'modere' | 'eleve' | 'maximum'
export type SportEndurance = 'aviron' | 'natation' | 'trail'

export interface BlocRecup {
  zone: Zone
  dureeSec?: number
  distanceM?: number
  actif: boolean
  label?: string
}

export interface Bloc {
  phase: PhaseBloc
  zone: Zone
  label: string
  intensiteRef?: string     // '@TR', '@CSS', 'RPE 7', '85-95% 2k'…
  cadenceSpm?: string       // aviron
  nage?: string             // natation
  gradient?: string         // trail
  dureeSec?: number
  distanceM?: number
  reps?: number
  recup?: BlocRecup
}

export interface Seance {
  id: string
  nom: string
  sport: SportEndurance
  bucket: string
  objectif: string          // le « pourquoi » physiologique
  dureeMinMin: number
  dureeMaxMin: number
  intensite: Intensite
  rpe: number
  pourQui: string
  phase: string             // Base | Build | Spé
  support: string[]
  tags: string[]
  blocs: Bloc[]
  conseil?: string
}
