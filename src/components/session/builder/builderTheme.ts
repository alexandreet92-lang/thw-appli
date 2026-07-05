// ══════════════════════════════════════════════════════════════════
// Thème par sport du Builder « Mes séances en réserve ».
// Mêmes teintes que la Bibliothèque (tokens --lib-<sport>), jamais de hex
// dans les composants. Chaque sport pointe vers le sport correspondant de
// l'éditeur Planning (table session_favorites) — source unique de la réserve.
// ══════════════════════════════════════════════════════════════════
import {
  IconBarbell, IconRun, IconBike, IconSwimming, IconKayak, IconFlame, type Icon,
} from '@tabler/icons-react'

// Clé sport de l'éditeur Planning (Session.sport / session_favorites.sport).
export type PlanningSport = 'run' | 'bike' | 'swim' | 'hyrox' | 'rowing' | 'gym' | 'elliptique'

export type BuilderSportId = 'muscu' | 'running' | 'velo' | 'natation' | 'aviron' | 'hyrox'

export interface BuilderSportTheme {
  id: BuilderSportId
  label: string
  labelKey: string
  tagline: string
  taglineKey: string
  icon: Icon
  accent: string          // var(--lib-<sport>)
  soft: string            // var(--lib-<sport>-soft)
  planning: PlanningSport  // sport correspondant côté éditeur Planning
  // Sports Planning regroupés sous cette carte (ex. elliptique → vélo).
  also?: PlanningSport[]
}

export const BUILDER_THEME: Record<BuilderSportId, BuilderSportTheme> = {
  muscu:    { id: 'muscu',    label: 'Muscu / Renfo', labelKey: 'sessbiblio.sportMuscu',    tagline: 'Circuits, séries, reps',     taglineKey: 'sessbiblio.builderTaglineMuscu',    icon: IconBarbell,  accent: 'var(--lib-muscu)',    soft: 'var(--lib-muscu-soft)',    planning: 'gym' },
  running:  { id: 'running',  label: 'Running',       labelKey: 'sessbiblio.sportRunning',  tagline: 'Blocs, intervalles, allure', taglineKey: 'sessbiblio.builderTaglineRunning',  icon: IconRun,      accent: 'var(--lib-running)',  soft: 'var(--lib-running-soft)',  planning: 'run' },
  velo:     { id: 'velo',     label: 'Vélo',          labelKey: 'sessbiblio.sportVelo',     tagline: 'Watts, zones, blocs',        taglineKey: 'sessbiblio.builderTaglineVelo',     icon: IconBike,     accent: 'var(--lib-velo)',     soft: 'var(--lib-velo-soft)',     planning: 'bike', also: ['elliptique'] },
  natation: { id: 'natation', label: 'Natation',      labelKey: 'sessbiblio.sportNatation', tagline: 'Séries, distances, zones',   taglineKey: 'sessbiblio.builderTaglineNatation', icon: IconSwimming, accent: 'var(--lib-natation)', soft: 'var(--lib-natation-soft)', planning: 'swim' },
  aviron:   { id: 'aviron',   label: 'Aviron',        labelKey: 'sessbiblio.sportAviron',   tagline: 'Blocs, seuil, distance',     taglineKey: 'sessbiblio.builderTaglineAviron',   icon: IconKayak,    accent: 'var(--lib-aviron)',   soft: 'var(--lib-aviron-soft)',   planning: 'rowing' },
  hyrox:    { id: 'hyrox',    label: 'Hyrox',         labelKey: 'sessbiblio.sportHyrox',    tagline: 'Ateliers, circuits, runs',   taglineKey: 'sessbiblio.builderTaglineHyrox',    icon: IconFlame,    accent: 'var(--lib-hyrox)',    soft: 'var(--lib-hyrox-soft)',    planning: 'hyrox' },
}

export const BUILDER_ORDER: BuilderSportId[] = [
  'muscu', 'running', 'velo', 'natation', 'aviron', 'hyrox',
]

// Sport Planning → carte Builder (pour regrouper les favoris par sport).
export function builderIdFromPlanning(sport: string): BuilderSportId {
  for (const id of BUILDER_ORDER) {
    const t = BUILDER_THEME[id]
    if (t.planning === sport || t.also?.includes(sport as PlanningSport)) return id
  }
  return 'muscu'
}
