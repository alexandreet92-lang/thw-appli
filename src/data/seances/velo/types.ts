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

// Niveau d'adaptation du volume (fourchettes explicites par séance).
export type Niveau = 'debutant' | 'intermediaire' | 'avance' | 'elite'
export type RepsRange = readonly [number, number]

export interface BlocRecup {
  zone: Zone
  dureeSec: number
  actif: boolean
}

// Segment d'un bloc COMPOSITE (set entrelacé à intensité variable),
// ex. over-under = reps × (1' @105% + 1' @90%). recupSec : micro-récup
// intra-set après ce segment (0/absent = enchaîné).
export interface BlocSegment {
  zone: Zone
  label?: string
  puissance?: string
  cadence?: Cadence
  dureeSec: number
  recupSec?: number
  recupZone?: Zone
}

export interface Bloc {
  phase: PhaseBloc
  zone: Zone                 // pilote la COULEUR ; la hauteur suit la puissance
  label: string
  puissance?: string         // "110-120% FTP", "Z2"…  → pilote la HAUTEUR
  cadence?: Cadence
  dureeSec?: number          // durée d'effort (absente si bloc composite : voir segments)
  reps?: number              // défaut 1
  recup?: BlocRecup
  // Adaptation du volume par niveau (fourchettes). Une seule dimension utile
  // par bloc : soit le nombre de reps, soit la durée d'effort.
  repsParNiveau?: Partial<Record<Niveau, RepsRange>>
  dureeSecParNiveau?: Partial<Record<Niveau, RepsRange>>
  // Set composite (intensités entrelacées dans une même rep).
  segments?: BlocSegment[]
}

// Conseils approfondis (mêmes rubriques que le running).
export interface ConseilsDetail {
  execution?: string
  erreurs?: string
  progression?: string
  quand?: string
}

// Variante : même intention, structure différente, volume cumulé ~équivalent.
export interface Variante {
  id: string
  nom: string
  pourquoi: string
  blocs: Bloc[]
  conseil?: string
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
  conseils?: ConseilsDetail
  variantes?: Variante[]
}
