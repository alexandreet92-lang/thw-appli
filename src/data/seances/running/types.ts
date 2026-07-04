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

// Niveau de l'athlète — pilote le VOLUME (répétitions) d'un bloc.
export type Niveau = 'debutant' | 'intermediaire' | 'avance' | 'elite'
// Fourchette de répétitions [min, max] pour un niveau (ex. [3, 4] × 1000m).
export type RepsRange = readonly [number, number]

export interface BlocRecup {
  zone: Zone
  dureeSec?: number
  distanceM?: number
  actif: boolean
  label?: string
}

// Segment d'un bloc COMPOSITE (set entrelacé à intensité variable),
// ex. reps × (500 @105% + 1000 @10k + 500 @105%).
// recupSec : micro-récup INTRA-set après ce segment (ex. 400@5k /30'' 300@3000).
export interface BlocSegment {
  zone: Zone
  label?: string
  allure?: string
  distanceM?: number
  dureeSec?: number
  recupSec?: number             // récup intra-set après ce segment (0/absent = enchaîné)
  recupZone?: Zone              // zone de cette micro-récup (défaut Z1)
}

export interface Bloc {
  phase: PhaseBloc
  zone: Zone                    // pilote couleur + hauteur de barre
  label: string
  allure?: string               // "@5k", "@seuil", "EF"…
  distanceM?: number            // soit distance…
  dureeSec?: number             // …soit durée
  reps?: number                 // défaut 1 (= volume niveau intermédiaire)
  // Volume par NIVEAU en fourchette [min,max]. Une seule des trois dimensions
  // varie selon le bloc : nb de répétitions, distance, ou durée. Absent → fixe.
  repsParNiveau?: Partial<Record<Niveau, RepsRange>>
  distanceMParNiveau?: Partial<Record<Niveau, RepsRange>>   // mètres
  dureeSecParNiveau?: Partial<Record<Niveau, RepsRange>>    // secondes
  // Set COMPOSITE : le bloc devient reps × (segments…), intensités entrelacées.
  segments?: BlocSegment[]
  recup?: BlocRecup
}

// Conseils approfondis par type de séance (affichés dans le détail).
export interface ConseilsDetail {
  execution?: string            // comment bien exécuter
  erreurs?: string              // erreurs fréquentes à éviter
  progression?: string          // comment faire évoluer la séance dans le temps
  quand?: string                // quand la placer dans la semaine / le cycle
}

// Variante d'une séance — MÊME intention, structure différente
// (ex. seuil : 5×1000 vs 3×2000). Réutilise la méta de la séance de base.
export interface Variante {
  id: string
  nom: string                   // ex. "Format long 3×2000"
  pourquoi: string              // en quoi elle diffère / quand la préférer
  blocs: Bloc[]                 // scalables par niveau comme la base
  conseil?: string
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
  conseil?: string              // conseil court (vignette + fallback)
  conseils?: ConseilsDetail     // conseils approfondis (détail)
  variantes?: Variante[]        // 1-2 variantes (même intention)
}
