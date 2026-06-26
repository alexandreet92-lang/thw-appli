// ══════════════════════════════════════════════════════════════════
// Thème par sport du Builder « Mes séances en réserve ».
// Mêmes teintes que la Bibliothèque (tokens --lib-<sport>), jamais de hex
// dans les composants. Clés = type Sport de la page Session.
// ══════════════════════════════════════════════════════════════════
import {
  IconBarbell, IconRun, IconBike, IconSwimming, IconKayak, IconFlame, IconTrophy, type Icon,
} from '@tabler/icons-react'

export type BuilderSportId = 'muscu' | 'running' | 'velo' | 'natation' | 'hyrox' | 'aviron' | 'triathlon'

export interface BuilderSportTheme {
  id: BuilderSportId
  label: string
  tagline: string
  icon: Icon
  accent: string   // var(--lib-<sport>)
  soft: string     // var(--lib-<sport>-soft)
}

export const BUILDER_THEME: Record<BuilderSportId, BuilderSportTheme> = {
  muscu:     { id: 'muscu',     label: 'Muscu / Renfo', tagline: 'Circuits, séries, reps',        icon: IconBarbell,  accent: 'var(--lib-muscu)',     soft: 'var(--lib-muscu-soft)' },
  running:   { id: 'running',   label: 'Running',       tagline: 'Blocs, intervalles, allure',    icon: IconRun,      accent: 'var(--lib-running)',   soft: 'var(--lib-running-soft)' },
  velo:      { id: 'velo',      label: 'Vélo',          tagline: 'Watts, zones, blocs',           icon: IconBike,     accent: 'var(--lib-velo)',      soft: 'var(--lib-velo-soft)' },
  natation:  { id: 'natation',  label: 'Natation',      tagline: 'Séries, distances, zones',      icon: IconSwimming, accent: 'var(--lib-natation)',  soft: 'var(--lib-natation-soft)' },
  hyrox:     { id: 'hyrox',     label: 'Hyrox',         tagline: 'Ateliers, circuits, runs',      icon: IconFlame,    accent: 'var(--lib-hyrox)',     soft: 'var(--lib-hyrox-soft)' },
  aviron:    { id: 'aviron',    label: 'Aviron',        tagline: 'Blocs, seuil, distance',        icon: IconKayak,    accent: 'var(--lib-aviron)',    soft: 'var(--lib-aviron-soft)' },
  triathlon: { id: 'triathlon', label: 'Triathlon',     tagline: 'Brick, simulation',             icon: IconTrophy,   accent: 'var(--lib-triathlon)', soft: 'var(--lib-triathlon-soft)' },
}

// Ordre d'affichage de la grille.
export const BUILDER_ORDER: BuilderSportId[] = [
  'muscu', 'running', 'velo', 'natation', 'hyrox', 'aviron', 'triathlon',
]
