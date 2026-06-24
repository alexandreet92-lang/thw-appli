// ══════════════════════════════════════════════════════════════════
// Bibliothèque — Séances Vélo. Modèle blocs (time-based) → profil.
// Voir PROMPT_BIBLIO_VELO.md §2/§3.
// ══════════════════════════════════════════════════════════════════

export type VeloBucket =
  | 'aerobie' | 'sl1' | 'sl2' | 'pma' | 'force' | 'velocite' | 'sprints' | 'mixte'
export type Zone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6' | 'Z7'
export type Cadence = 'basse' | 'normale' | 'haute'   // 45-60 / 85-95 / 100-120
export type Terrain = 'plat' | 'cote'
export type Support = 'route' | 'home-trainer'
export type PhaseBloc = 'echauffement' | 'corps' | 'recup' | 'retour-calme'
export type Intensite = 'faible' | 'modere' | 'eleve' | 'maximum'

export interface BlocRecup {
  zone: Zone
  dureeSec: number
  actif: boolean
}

export interface Bloc {
  phase: PhaseBloc
  zone: Zone                 // pilote couleur + hauteur de barre
  label: string
  puissance?: string         // "110-120% FTP", "Z2"…
  cadence?: Cadence
  dureeSec: number           // TOUJOURS en temps
  reps?: number              // défaut 1
  recup?: BlocRecup
}

export interface Seance {
  id: string
  nom: string
  sport: 'velo'
  bucket: VeloBucket
  objectif: string
  dureeMinMin: number        // fourchette obligatoire (minutes)
  dureeMaxMin: number
  intensite: Intensite
  rpe: number
  pourQui: string
  phase: string              // Base | Build | Spé
  support: Support[]
  terrain?: Terrain
  cadenceTag?: Cadence
  tags: string[]
  blocs: Bloc[]
  conseil?: string
}
