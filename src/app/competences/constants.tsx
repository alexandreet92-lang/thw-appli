'use client'

import {
  List, Footprints, Mountain, Bike, Triangle, Waves, Sailboat, Dumbbell, Flame, Globe,
  Brain, Calendar, Zap, Apple, Moon, TrendingUp, Target,
} from 'lucide-react'
import type { Sport, CategorieCompetence } from '@/types/competences'

export type SportFilter = Sport | 'all'
export type CompetenceTab = 'toutes' | 'actives' | 'miennes'

export const SPORTS_ORDER: SportFilter[] = [
  'all', 'running', 'trail', 'cyclisme', 'triathlon', 'natation', 'rowing', 'muscu', 'hyrox', 'transversale',
]

export const SPORT_LABELS: Record<SportFilter, string> = {
  all: 'w4d.sport_all',
  running: 'w4d.sport_running',
  trail: 'w4d.sport_trail',
  cyclisme: 'w4d.sport_cyclisme',
  triathlon: 'w4d.sport_triathlon',
  natation: 'w4d.sport_natation',
  rowing: 'w4d.sport_rowing',
  muscu: 'w4d.sport_muscu',
  hyrox: 'w4d.sport_hyrox',
  transversale: 'w4d.sport_transversale',
}

export const CATEGORIES_ORDER: CategorieCompetence[] = [
  'methodologie', 'periodisation', 'adaptation', 'nutrition', 'recuperation', 'force', 'hypertrophie', 'performance',
]

export const CATEGORY_LABELS: Record<CategorieCompetence, string> = {
  methodologie: 'w4d.cat_methodologie',
  periodisation: 'w4d.cat_periodisation',
  adaptation: 'w4d.cat_adaptation',
  nutrition: 'w4d.cat_nutrition',
  recuperation: 'w4d.cat_recuperation',
  force: 'w4d.cat_force',
  hypertrophie: 'w4d.cat_hypertrophie',
  performance: 'w4d.cat_performance',
}

export function sportIcon(s: SportFilter, size = 15): React.ReactNode {
  const p = { size, strokeWidth: 1.8 }
  switch (s) {
    case 'all':          return <List {...p} />
    case 'running':      return <Footprints {...p} />
    case 'trail':        return <Mountain {...p} />
    case 'cyclisme':     return <Bike {...p} />
    case 'triathlon':    return <Triangle {...p} />
    case 'natation':     return <Waves {...p} />
    case 'rowing':       return <Sailboat {...p} />
    case 'muscu':        return <Dumbbell {...p} />
    case 'hyrox':        return <Flame {...p} />
    case 'transversale': return <Globe {...p} />
  }
}

export function categoryIcon(c: CategorieCompetence, size = 15): React.ReactNode {
  const p = { size, strokeWidth: 1.8 }
  switch (c) {
    case 'methodologie':  return <Brain {...p} />
    case 'periodisation': return <Calendar {...p} />
    case 'adaptation':    return <Zap {...p} />
    case 'nutrition':     return <Apple {...p} />
    case 'recuperation':  return <Moon {...p} />
    case 'force':         return <Dumbbell {...p} />
    case 'hypertrophie':  return <TrendingUp {...p} />
    case 'performance':   return <Target {...p} />
  }
}
