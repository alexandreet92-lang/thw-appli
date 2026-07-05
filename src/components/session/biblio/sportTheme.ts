// ══════════════════════════════════════════════════════════════════
// Thème par sport — source de vérité unique de la Bibliothèque.
// Teintes = tokens --lib-<sport> (jamais de hex dans les composants).
// ══════════════════════════════════════════════════════════════════
import {
  IconBarbell, IconRun, IconMountain, IconBike, IconSwimming, IconKayak, IconFlame, IconTrophy, type Icon,
} from '@tabler/icons-react'

export type SportId = 'muscu' | 'running' | 'trail' | 'velo' | 'natation' | 'aviron' | 'hyrox' | 'triathlon'

export interface SportTheme {
  id: SportId
  label: string
  labelKey: string
  tagline: string
  taglineKey: string
  icon: Icon
  accent: string   // var(--lib-<sport>)
  soft: string     // var(--lib-<sport>-soft)
  status: 'live' | 'soon'
}

export const SPORT_THEME: Record<SportId, SportTheme> = {
  muscu:     { id: 'muscu',     label: 'Muscu / Renfo', labelKey: 'sessbiblio.sportMuscu',     tagline: 'Force, hypertrophie & renfo',   taglineKey: 'sessbiblio.sportTaglineMuscu',     icon: IconBarbell,  accent: 'var(--lib-muscu)',     soft: 'var(--lib-muscu-soft)',     status: 'live' },
  running:   { id: 'running',   label: 'Running',       labelKey: 'sessbiblio.sportRunning',   tagline: 'Allure, seuil & VO2max',         taglineKey: 'sessbiblio.sportTaglineRunning',   icon: IconRun,      accent: 'var(--lib-running)',   soft: 'var(--lib-running-soft)',   status: 'live' },
  trail:     { id: 'trail',     label: 'Trail',         labelKey: 'sessbiblio.sportTrail',     tagline: 'Côtes, descente & ultra',        taglineKey: 'sessbiblio.sportTaglineTrail',     icon: IconMountain, accent: 'var(--lib-trail)',     soft: 'var(--lib-trail-soft)',     status: 'live' },
  velo:      { id: 'velo',      label: 'Vélo',          labelKey: 'sessbiblio.sportVelo',      tagline: 'Watts, seuil & PMA',             taglineKey: 'sessbiblio.sportTaglineVelo',      icon: IconBike,     accent: 'var(--lib-velo)',      soft: 'var(--lib-velo-soft)',      status: 'live' },
  natation:  { id: 'natation',  label: 'Natation',      labelKey: 'sessbiblio.sportNatation',  tagline: 'Technique, CSS & vitesse',       taglineKey: 'sessbiblio.sportTaglineNatation',  icon: IconSwimming, accent: 'var(--lib-natation)',  soft: 'var(--lib-natation-soft)',  status: 'live' },
  aviron:    { id: 'aviron',    label: 'Aviron',        labelKey: 'sessbiblio.sportAviron',    tagline: 'Erg, seuil & allure 2k',         taglineKey: 'sessbiblio.sportTaglineAviron',    icon: IconKayak,    accent: 'var(--lib-aviron)',    soft: 'var(--lib-aviron-soft)',    status: 'live' },
  hyrox:     { id: 'hyrox',     label: 'Hyrox',         labelKey: 'sessbiblio.sportHyrox',     tagline: 'Stations & compromised run',     taglineKey: 'sessbiblio.sportTaglineHyrox',     icon: IconFlame,    accent: 'var(--lib-hyrox)',     soft: 'var(--lib-hyrox-soft)',     status: 'soon' },
  triathlon: { id: 'triathlon', label: 'Triathlon',     labelKey: 'sessbiblio.sportTriathlon', tagline: 'Enchaînements & brick',          taglineKey: 'sessbiblio.sportTaglineTriathlon', icon: IconTrophy,   accent: 'var(--lib-triathlon)', soft: 'var(--lib-triathlon-soft)', status: 'soon' },
}

// Ordre d'affichage de la grille : sports « live » d'abord, « soon » à la fin.
export const SPORT_ORDER: SportId[] = [
  'muscu', 'running', 'trail', 'velo', 'natation', 'aviron', 'hyrox', 'triathlon',
]

// Sports possédant des exercices (→ onglets Exercices | Séances).
export const SPORTS_AVEC_EXERCICES: SportId[] = ['muscu', 'hyrox']
